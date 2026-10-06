import { Battle, Weather } from '../../domain/entities/battle.entity';
import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '../../domain/entities/status-condition.enum';
import { IBattleRepository } from '../../domain/battle.repository.interface';
import { getSideConditions } from '../../domain/state/side-state';
import { ITrainedPokemonRepository } from '@/modules/trainer/domain/trainer.repository.interface';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { applyIndirectDamage } from '@/modules/pokemon/domain/battle-events/indirect-damage';
import { applyHeal, fractionOfMaxHp } from '@/modules/pokemon/domain/battle-events/heal';
import { applyDrainHeal } from '@/modules/pokemon/domain/battle-events/drain-heal';
import { applyStatChanges } from '@/modules/pokemon/domain/battle-events/stat-change';
import { tryInflictStatus } from '@/modules/pokemon/domain/battle-events/status-infliction';
import { resolveEffectiveStatusCondition } from '@/modules/pokemon/domain/battle-events/effective-status';
import { resolveAbilityName } from '@/modules/pokemon/domain/battle-events/ability-lookup';

/**
 * すなあらしのダメージを受けないタイプ
 */
const SANDSTORM_IMMUNE_TYPES: readonly string[] = ['いわ', 'じめん', 'はがね'];

/**
 * すなあらしのダメージを受けない特性（マジックガードは applyIndirectDamage が防ぐ）
 */
const SANDSTORM_IMMUNE_ABILITIES: readonly string[] = [
  'すながくれ',
  'すなかき',
  'すなのちから',
  'ぼうじん',
];

/**
 * しおづけのダメージが 1/4 になるタイプ
 */
const SALT_CURE_WEAK_TYPES: readonly string[] = ['みず', 'はがね'];

/**
 * VolatileResidualProcessor
 * ターン終了時の、天候・陣営・一時的な状態による HP の増減と、遅れて効く効果を処理する
 * StatusConditionProcessorService.processTurnEndAbilities が、本家の residual の順に近い順で呼ぶ
 *
 * - applyWeatherDamage: すなあらし（最大 HP の 1/16）
 * - applyWish: ねがいごと（wish.turns が 1 の陣営の場のポケモンを回復）
 * - applyBeforeStatusDamage: アクアリング・ねをはる（1/16 回復）→ やどりぎのタネ（1/8 を吸う）
 * - applyAfterStatusDamage: あくむ（1/4）→ のろい（1/4）→ バインド（1/8）→ しおづけ（1/8、みず・はがねは 1/4）→
 *   たこがため（防御・特防 -1）→ あくび（残り 1 でねむり）→ ほろびのうた（0 でひんし、それ以外は 1 減らす）
 *
 * ダメージはすべて applyIndirectDamage で与える（マジックガードなら受けない。ほろびのうたは除く）。
 * 回復は applyHeal で行う（かいふくふうじ中は回復しない）。
 * 注: 本家は効果ごとに場の全員を素早さ順に処理するが、ここではポケモンごとに順に処理する
 */
export class VolatileResidualProcessor {
  constructor(
    private readonly battleRepository: IBattleRepository,
    private readonly trainedPokemonRepository: ITrainedPokemonRepository,
  ) {}

  /**
   * すなあらしのダメージ（いわ・じめん・はがねタイプと、すながくれ・すなかき・すなのちから・ぼうじんは受けない）
   * @param weather 効果のある天候（ノーてんき・エアロックを反映したもの）
   */
  async applyWeatherDamage(
    activePokemon: readonly BattlePokemonStatus[],
    weather: Weather | null,
    battleContext: BattleContext,
  ): Promise<void> {
    if (weather !== Weather.Sandstorm) {
      return;
    }
    for (const status of activePokemon) {
      const latest = await this.refresh(status);
      if (latest.isFainted()) {
        continue;
      }
      const trainedPokemon = await this.trainedPokemonRepository.findById(latest.trainedPokemonId);
      const typeNames = [
        trainedPokemon?.pokemon.primaryType.name,
        trainedPokemon?.pokemon.secondaryType?.name,
      ];
      if (typeNames.some(name => name !== undefined && SANDSTORM_IMMUNE_TYPES.includes(name))) {
        continue;
      }
      if (SANDSTORM_IMMUNE_ABILITIES.includes(trainedPokemon?.ability?.name ?? '')) {
        continue;
      }
      await applyIndirectDamage(latest, fractionOfMaxHp(latest, 16), battleContext);
    }
  }

  /**
   * ねがいごと: wish.turns が 1 の陣営の場のポケモンを、healAmount だけ回復する（ねがいごとは tickSideStateAtTurnEnd で消える）
   */
  async applyWish(battle: Battle, battleContext: BattleContext): Promise<void> {
    for (const trainerId of [battle.trainer1Id, battle.trainer2Id]) {
      const wish = getSideConditions(battle.sideState, trainerId).wish;
      if (wish?.turns !== 1) {
        continue;
      }
      const active = await this.battleRepository.findActivePokemonByBattleIdAndTrainerId(
        battle.id,
        trainerId,
      );
      if (active && !active.isFainted()) {
        await applyHeal(active, wish.healAmount, battleContext);
      }
    }
  }

  /**
   * 状態異常のダメージより前の効果（アクアリング・ねをはる・やどりぎのタネ）
   * @param opponent 相手の場のポケモン（やどりぎのタネで回復する）
   */
  async applyBeforeStatusDamage(
    status: BattlePokemonStatus,
    opponent: BattlePokemonStatus | undefined,
    battleContext: BattleContext,
  ): Promise<void> {
    let latest = await this.refresh(status);
    if (latest.volatileState.aquaRing === true) {
      await applyHeal(latest, fractionOfMaxHp(latest, 16), battleContext);
      latest = await this.refresh(latest);
    }
    if (latest.volatileState.ingrain === true) {
      await applyHeal(latest, fractionOfMaxHp(latest, 16), battleContext);
      latest = await this.refresh(latest);
    }
    if (latest.volatileState.leechSeed === true && !latest.isFainted() && opponent) {
      const seeder = await this.refresh(opponent);
      if (!seeder.isFainted()) {
        const drained = await applyIndirectDamage(
          latest,
          fractionOfMaxHp(latest, 8),
          battleContext,
        );
        if (drained > 0) {
          await applyDrainHeal(seeder, await this.refresh(latest), drained, battleContext);
        }
      }
    }
  }

  /**
   * 状態異常のダメージよりあとの効果（あくむ・のろい・バインド・しおづけ・たこがため・あくび・ほろびのうた）
   */
  async applyAfterStatusDamage(
    status: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<void> {
    let latest = await this.refresh(status);
    const damage = async (divisor: number): Promise<void> => {
      if (!latest.isFainted()) {
        await applyIndirectDamage(latest, fractionOfMaxHp(latest, divisor), battleContext);
        latest = await this.refresh(latest);
      }
    };

    // あくむ: ねむっている（ぜったいねむりを含む）間だけ 1/4。目を覚ましたら消える
    if (latest.volatileState.nightmare === true) {
      const effective = await resolveEffectiveStatusCondition(latest, battleContext);
      if (effective === StatusCondition.Sleep) {
        await damage(4);
      } else {
        latest =
          (await this.battleRepository.patchVolatileState(latest.id, { nightmare: null })) ??
          latest;
      }
    }

    // のろい（ゴースト）: 1/4
    if (latest.volatileState.cursed === true) {
      await damage(4);
    }

    // バインド: 残りターン数を 1 減らし、0 なら解ける（ダメージなし）。残っていれば 1/8
    const partialTrap = latest.volatileState.partialTrap;
    if (partialTrap !== undefined && !latest.isFainted()) {
      const turns = partialTrap.turns - 1;
      latest =
        (await this.battleRepository.patchVolatileState(latest.id, {
          partialTrap: turns > 0 ? { ...partialTrap, turns } : null,
        })) ?? latest;
      if (turns > 0) {
        await damage(8);
      }
    }

    // しおづけ: 1/8（みず・はがねタイプは 1/4）
    if (latest.volatileState.saltCure === true) {
      const trainedPokemon = await this.trainedPokemonRepository.findById(latest.trainedPokemonId);
      const weak = [
        trainedPokemon?.pokemon.primaryType.name,
        trainedPokemon?.pokemon.secondaryType?.name,
      ].some(name => name !== undefined && SALT_CURE_WEAK_TYPES.includes(name));
      await damage(weak ? 4 : 8);
    }

    // たこがため: 防御・特防 -1（たこがためを使ったポケモンが起こした、技による変化として扱う）
    if (latest.volatileState.octolock === true && !latest.isFainted()) {
      await this.applyOctolock(latest, battleContext);
      latest = await this.refresh(latest);
    }

    // あくび: 残りターン数が 1 なら、ねむりにする（yawnTurns はこのあとの tickVolatileStateAtTurnEnd で消える）
    if (latest.volatileState.yawnTurns === 1 && !latest.isFainted()) {
      await tryInflictStatus(latest, StatusCondition.Sleep, battleContext, {
        source: { kind: 'other', name: 'あくび' },
      });
      latest = await this.refresh(latest);
    }

    // ほろびのうた: 0 ならひんし（マジックガードでも防げない）。それ以外は 1 減らす
    const perishCount = latest.volatileState.perishCount;
    if (perishCount !== undefined && !latest.isFainted()) {
      if (perishCount <= 0) {
        await this.battleRepository.updateBattlePokemonStatus(latest.id, { currentHp: 0 });
      } else {
        await this.battleRepository.patchVolatileState(latest.id, { perishCount: perishCount - 1 });
      }
    }
  }

  /**
   * たこがためで、防御・特防を 1 段階ずつ下げる
   */
  private async applyOctolock(
    target: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<void> {
    const sourceId = target.volatileState.trappedByStatusId;
    const source =
      sourceId !== undefined
        ? await this.battleRepository.findBattlePokemonStatusById(sourceId)
        : undefined;
    await applyStatChanges(
      target,
      [
        { statType: 'defense', rankChange: -1 },
        { statType: 'specialDefense', rankChange: -1 },
      ],
      battleContext,
      {
        source: {
          pokemon: source ?? undefined,
          abilityName: source ? await resolveAbilityName(source, battleContext) : undefined,
          kind: 'move',
          name: 'たこがため',
        },
      },
    );
  }

  /**
   * 最新の状態を読み直す（読めなければ手元の状態を使う）
   */
  private async refresh(pokemon: BattlePokemonStatus): Promise<BattlePokemonStatus> {
    return (await this.battleRepository.findBattlePokemonStatusById(pokemon.id)) ?? pokemon;
  }
}
