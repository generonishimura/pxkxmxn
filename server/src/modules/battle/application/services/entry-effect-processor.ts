import { Battle } from '../../domain/entities/battle.entity';
import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '../../domain/entities/status-condition.enum';
import { IBattleRepository } from '../../domain/battle.repository.interface';
import { getSideConditions } from '../../domain/state/side-state';
import { isGrounded } from '../../domain/logic/grounded';
import { isMajorStatus } from '../../domain/logic/major-status';
import {
  shouldHealOnEntry,
  spikesDamage,
  stealthRockDamage,
  toxicSpikesOutcome,
} from '../../domain/logic/entry-hazards';
import { ITrainedPokemonRepository } from '@/modules/trainer/domain/trainer.repository.interface';
// タイプ変更・フォルムチェンジ・特性の書き換えの仕組み（Issue #103 #110 #114 #135 一部）
import { resolveBattlePokemonTraits } from '@/modules/pokemon/domain/battle-events/battle-traits';
import { TYPELESS_TYPE_NAME } from '../../domain/logic/effective-traits';
import { ITypeEffectivenessRepository } from '@/modules/pokemon/domain/pokemon.repository.interface';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { applyIndirectDamage } from '@/modules/pokemon/domain/battle-events/indirect-damage';
import { tryInflictStatus } from '@/modules/pokemon/domain/battle-events/status-infliction';
import { applyStatChanges } from '@/modules/pokemon/domain/battle-events/stat-change';

/**
 * ステルスロックのダメージの相性を求めるタイプ
 */
const STEALTH_ROCK_TYPE_NAME = 'いわ';

/**
 * EntryEffectProcessor
 * 交代で場に出たポケモンへの、陣営の効果を処理する（PokemonSwitcherService.executeSwitch が呼ぶ）
 *
 * 本家の順に近い順で行う。
 * 1. いやしのねがい・みかづきのまい（本家の onSwap。設置技より先）: HP・状態異常（みかづきのまいは PP も）を回復する。
 *    回復するところがないポケモンが出てきたときは、使わずに残す（第 8 世代から）
 * 2. 設置技: ステルスロック → まきびし → どくびし → ねばねばネット。ひんしになったら、そこで止める
 *    - ステルスロック: 最大 HP × いわの相性 / 8
 *    - まきびし（地面にいるポケモン）: 1 層 1/8・2 層 1/6・3 層 1/4
 *    - どくびし（地面にいるポケモン）: 1 層どく・2 層もうどく。どくタイプは消す。付与元は相手の場のポケモン
 *      （しんぴのまもり・ミストフィールド・特性で防げる）
 *    - ねばねばネット（地面にいるポケモン）: 素早さ -1（相手が起こした低下。しろいきり・クリアボディで防げる）
 * ダメージは applyIndirectDamage（マジックガードは受けない）
 * 注: 持ち物（あつぞこブーツ）はない
 */
export class EntryEffectProcessor {
  constructor(
    private readonly battleRepository: IBattleRepository,
    private readonly trainedPokemonRepository: ITrainedPokemonRepository,
    private readonly typeEffectivenessRepository: ITypeEffectivenessRepository,
  ) {}

  /**
   * 場に出たポケモンに陣営の効果を与える
   * @returns メッセージ（交代の結果に入れる）
   */
  async apply(battleId: number, enteringId: number): Promise<string[]> {
    const battle = await this.battleRepository.findById(battleId);
    let target = await this.battleRepository.findBattlePokemonStatusById(enteringId);
    if (!battle || !target) {
      return [];
    }
    const side = getSideConditions(battle.sideState, target.trainerId);
    if (
      side.healingWish === undefined &&
      side.stealthRock === undefined &&
      side.spikesLayers === undefined &&
      side.toxicSpikesLayers === undefined &&
      side.stickyWeb === undefined
    ) {
      return [];
    }
    // 実効のタイプと特性（交代しても残るフォルム・相手のかがくへんかガスを反映）
    const traits = await resolveBattlePokemonTraits(target, {
      battleRepository: this.battleRepository,
      trainedPokemonRepository: this.trainedPokemonRepository,
    });
    if (!traits) {
      return [];
    }
    const context = this.createContext(battle);
    const messages: string[] = [];

    const healMessage = await this.applyHealingWish(battle, target);
    if (healMessage) {
      messages.push(healMessage);
      target = (await this.refresh(target)) ?? target;
    }

    const typeNames = [...traits.typeNames];
    const grounded = isGrounded({
      typeNames,
      abilityName: traits.abilityName,
      volatileState: target.volatileState,
      sideState: battle.sideState,
    });
    const opponent = await this.findOpponent(battle, target.trainerId);

    if (side.stealthRock === true && !target.isFainted()) {
      const effectiveness = await this.rockEffectiveness(typeNames);
      const dealt = await applyIndirectDamage(
        target,
        stealthRockDamage(target.maxHp, effectiveness),
        context,
      );
      if (dealt > 0) {
        messages.push(`Pointed stones dug into the Pokemon! (${dealt} damage)`);
      }
      target = (await this.refresh(target)) ?? target;
    }
    if (side.spikesLayers !== undefined && grounded && !target.isFainted()) {
      const dealt = await applyIndirectDamage(
        target,
        spikesDamage(target.maxHp, side.spikesLayers),
        context,
      );
      if (dealt > 0) {
        messages.push(`The Pokemon was hurt by the spikes! (${dealt} damage)`);
      }
      target = (await this.refresh(target)) ?? target;
    }
    if (side.toxicSpikesLayers !== undefined && !target.isFainted()) {
      const outcome = toxicSpikesOutcome(side.toxicSpikesLayers, { grounded, typeNames });
      if (outcome === 'absorb') {
        await this.battleRepository.patchSideConditions(battle.id, target.trainerId, {
          toxicSpikesLayers: null,
        });
        messages.push('The poison spikes disappeared!');
      } else if (outcome !== 'none') {
        const status = outcome === 'badPoison' ? StatusCondition.BadPoison : StatusCondition.Poison;
        const { inflicted, messages: abilityMessages } = await tryInflictStatus(
          target,
          status,
          context,
          { source: { pokemon: opponent, kind: 'other', name: 'どくびし' } },
        );
        if (inflicted) {
          messages.push(
            outcome === 'badPoison'
              ? 'The Pokemon was badly poisoned!'
              : 'The Pokemon was poisoned!',
            ...abilityMessages,
          );
        }
      }
      target = (await this.refresh(target)) ?? target;
    }
    if (side.stickyWeb === true && grounded && !target.isFainted()) {
      const result = await applyStatChanges(
        target,
        [{ statType: 'speed', rankChange: -1 }],
        context,
        {
          source: { pokemon: opponent, kind: 'other', name: 'ねばねばネット' },
        },
      );
      if (result.applied.length > 0) {
        messages.push('The Pokemon was caught in a sticky web! Speed fell!');
      }
      messages.push(...result.messages);
    }
    return messages;
  }

  /**
   * いやしのねがい・みかづきのまいで回復する（回復したら陣営のキーを消す）
   * @returns メッセージ（回復しなかったら null）
   */
  private async applyHealingWish(
    battle: Battle,
    target: BattlePokemonStatus,
  ): Promise<string | null> {
    const kind = getSideConditions(battle.sideState, target.trainerId).healingWish;
    if (kind === undefined || target.isFainted()) {
      return null;
    }
    const moves =
      (await this.battleRepository.findBattlePokemonMovesByBattlePokemonStatusId(target.id)) ?? [];
    const ppFull = moves.every(move => move.currentPp >= move.maxPp);
    if (
      !shouldHealOnEntry(kind, {
        hpFull: target.currentHp >= target.maxHp,
        hasStatus: isMajorStatus(target.statusCondition),
        ppFull,
      })
    ) {
      return null;
    }
    await this.battleRepository.updateBattlePokemonStatus(target.id, {
      currentHp: target.maxHp,
      statusCondition: StatusCondition.None,
    });
    if (kind === 'lunarDance') {
      for (const move of moves.filter(m => m.currentPp < m.maxPp)) {
        await this.battleRepository.updateBattlePokemonMove(move.id, { currentPp: move.maxPp });
      }
    }
    await this.battleRepository.patchSideConditions(battle.id, target.trainerId, {
      healingWish: null,
    });
    return kind === 'lunarDance'
      ? 'The Pokemon became cloaked in mystical moonlight!'
      : 'The healing wish came true!';
  }

  /**
   * いわタイプの技の、実効のタイプへの相性（0.25〜4）。タイプなし（???）は等倍
   */
  private async rockEffectiveness(typeNames: readonly string[]): Promise<number> {
    const rock = await this.typeEffectivenessRepository.findTypeByName(STEALTH_ROCK_TYPE_NAME);
    if (!rock) {
      return 1;
    }
    const chart = await this.typeEffectivenessRepository.getTypeEffectivenessMap();
    let product = 1;
    for (const typeName of typeNames) {
      if (typeName === TYPELESS_TYPE_NAME) {
        continue;
      }
      const type = await this.typeEffectivenessRepository.findTypeByName(typeName);
      product *= type ? (chart.get(`${rock.id}-${type.id}`) ?? 1) : 1;
    }
    return product;
  }

  /**
   * 相手の場のポケモン（どくびし・ねばねばネットを置いた側として扱う）
   */
  private async findOpponent(
    battle: Battle,
    trainerId: number,
  ): Promise<BattlePokemonStatus | undefined> {
    const opponentTrainerId =
      trainerId === battle.trainer1Id ? battle.trainer2Id : battle.trainer1Id;
    return (
      (await this.battleRepository.findActivePokemonByBattleIdAndTrainerId(
        battle.id,
        opponentTrainerId,
      )) ?? undefined
    );
  }

  private createContext(battle: Battle): BattleContext {
    return {
      battle,
      battleRepository: this.battleRepository,
      trainedPokemonRepository: this.trainedPokemonRepository,
    };
  }

  private async refresh(status: BattlePokemonStatus): Promise<BattlePokemonStatus | null> {
    return this.battleRepository.findBattlePokemonStatusById(status.id);
  }
}
