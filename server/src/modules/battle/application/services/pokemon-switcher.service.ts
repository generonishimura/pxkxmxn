import { Injectable, Inject } from '@nestjs/common';
import { Battle } from '../../domain/entities/battle.entity';
import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import {
  VolatileState,
  batonPassPatch,
  clearVolatileOnSwitchOut,
  releaseVolatileReferencesTo,
  shedTailPatch,
  updateVolatileState,
} from '../../domain/state/volatile-state';
import { StatePatch } from '../../domain/state/state-field-parser';
import { SwitchBlocker, findSwitchBlocker } from '../../domain/logic/switch-restriction';
import {
  IBattleRepository,
  BATTLE_REPOSITORY_TOKEN,
} from '../../domain/battle.repository.interface';
import {
  ITrainedPokemonRepository,
  TRAINED_POKEMON_REPOSITORY_TOKEN,
} from '@/modules/trainer/domain/trainer.repository.interface';
import { StatusConditionHandler } from '../../domain/logic/status-condition-handler';
import { StatusCondition } from '../../domain/entities/status-condition.enum';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { IAbilityEffect } from '@/modules/pokemon/domain/abilities/ability-effect.interface';
import { NotFoundException } from '@/shared/domain/exceptions';
// 場の状態・設置技・交代の仕組み（Issue #102 #103 #108 #110 #135 一部）
import { PrimalWeatherReleaser } from './primal-weather-releaser';
import { EntryEffectProcessor } from './entry-effect-processor';
import {
  ITypeEffectivenessRepository,
  TYPE_EFFECTIVENESS_REPOSITORY_TOKEN,
} from '@/modules/pokemon/domain/pokemon.repository.interface';
import { crossesHalfHp, findSwitchTargets } from '../../domain/logic/party';
import { isGrounded } from '../../domain/logic/grounded';
import { getGlobalFieldState } from '../../domain/state/side-state';
// タイプ変更・フォルムチェンジ・特性の書き換えの仕組み（Issue #103 #110 #114 #119 #135 一部）
import { resolveBattlePokemonTraits } from '@/modules/pokemon/domain/battle-events/battle-traits';

/**
 * 交代のオプション
 */
export interface SwitchOptions {
  /**
   * 引っ込むポケモンから次のポケモンに引き継ぐもの
   * - batonPass: バトンタッチ（BATON_PASS_KEYS の一時的な状態と、能力ランク）
   * - shedTail: しっぽきり（みがわりだけ）
   */
  readonly transfer?: 'batonPass' | 'shedTail';
}

/**
 * 能力ランクの列（引っ込むと 0 に戻る。バトンタッチでは引き継ぐ）
 */
const RANK_KEYS = [
  'attackRank',
  'defenseRank',
  'specialAttackRank',
  'specialDefenseRank',
  'speedRank',
  'accuracyRank',
  'evasionRank',
] as const satisfies ReadonlyArray<keyof BattlePokemonStatus>;

/**
 * PokemonSwitcherService
 * ポケモン交代を処理するサービス
 */
@Injectable()
export class PokemonSwitcherService {
  private readonly primalWeatherReleaser: PrimalWeatherReleaser;
  private readonly entryEffects: EntryEffectProcessor;

  constructor(
    @Inject(BATTLE_REPOSITORY_TOKEN)
    private readonly battleRepository: IBattleRepository,
    @Inject(TRAINED_POKEMON_REPOSITORY_TOKEN)
    private readonly trainedPokemonRepository: ITrainedPokemonRepository,
    @Inject(TYPE_EFFECTIVENESS_REPOSITORY_TOKEN)
    typeEffectivenessRepository: ITypeEffectivenessRepository,
  ) {
    this.primalWeatherReleaser = new PrimalWeatherReleaser(
      battleRepository,
      trainedPokemonRepository,
    );
    this.entryEffects = new EntryEffectProcessor(
      battleRepository,
      trainedPokemonRepository,
      typeEffectivenessRepository,
    );
  }

  /**
   * 場を離れた・ひんしになったポケモンが出したゲンシ天候を終わらせる（同じ特性のポケモンが場にいれば引き継ぐ）
   * 交代では executeSwitch が呼ぶ。ひんしでは ExecuteTurnUseCase が呼ぶ
   */
  async releasePrimalWeather(battleId: number, leavingStatusId: number): Promise<void> {
    await this.primalWeatherReleaser.release(battleId, leavingStatusId);
  }

  /**
   * ゲンシ天候を出したポケモンの特性が書き換えられた・消された（スキルスワップ・いえき・かがくへんかガス）なら、
   * 場を離れたときと同じに天候を終わらせる。ExecuteTurnUseCase が行動のたびに呼ぶ
   */
  async releasePrimalWeatherIfAbilityLost(battleId: number): Promise<void> {
    await this.primalWeatherReleaser.releaseIfAbilityLost(battleId);
  }

  /**
   * 交代できない理由を返す（交代できるなら undefined）
   * ねをはる・逃げられない状態・バインド状態・相手の特性（trapsOpponent）・フェアリーロックを見る。
   * ゴーストタイプは、どれでも交代できる。かけたポケモンがひんし・場にいない、逃げられない状態とバインド状態は見ない。
   * 交代しようとするポケモンがひんしなら、何があっても入れ替えられる（本家もひんしの後の入れ替えは逃げられなくしない）
   * @param active 交代しようとしている場のポケモン
   * @param opponent 相手の場のポケモン（ひんしなら特性で逃げられなくしない）
   * @param battle バトル（フェアリーロック）
   */
  async findSwitchBlocker(
    active: BattlePokemonStatus,
    opponent?: BattlePokemonStatus,
    battle?: Battle,
  ): Promise<SwitchBlocker | undefined> {
    if (active.isFainted()) {
      return undefined;
    }
    const state = active.volatileState;
    const fairyLock =
      battle !== undefined && getGlobalFieldState(battle.sideState).fairyLockTurns !== undefined;
    const opponentAbility = await this.findTrappingAbility(opponent);
    if (
      state.ingrain === undefined &&
      state.trappedByStatusId === undefined &&
      state.partialTrap === undefined &&
      !fairyLock &&
      !opponentAbility
    ) {
      return undefined;
    }
    // 実効のタイプと特性（みずびたしのゴーストタイプ・いえきなどを反映）
    const traits = await resolveBattlePokemonTraits(active, this.traitsDeps());
    const typeNames = [...(traits?.typeNames ?? [])];
    const abilityName = traits?.abilityName;
    const trappedByAbility =
      opponent !== undefined &&
      opponentAbility?.trapsOpponent?.(
        opponent,
        {
          pokemon: active,
          typeNames,
          abilityName,
          grounded: isGrounded({
            typeNames,
            abilityName,
            volatileState: state,
            sideState: battle?.sideState,
          }),
        },
        battle
          ? {
              battle,
              battleRepository: this.battleRepository,
              trainedPokemonRepository: this.trainedPokemonRepository,
            }
          : undefined,
      ) === true;
    return findSwitchBlocker(await this.withoutReleasedTraps(state), typeNames, {
      trappedByAbility,
      fairyLock,
    });
  }

  /**
   * 相手の場のポケモンの、逃げられなくする特性（trapsOpponent を持つ特性）
   * 相手がいない・ひんし・特性が効いていない（いえき・かがくへんかガス）ときは undefined
   */
  private async findTrappingAbility(
    opponent: BattlePokemonStatus | undefined,
  ): Promise<IAbilityEffect | undefined> {
    if (!opponent || opponent.isFainted()) {
      return undefined;
    }
    const effect = await this.abilityEffectOf(opponent);
    return effect?.trapsOpponent ? effect : undefined;
  }

  /**
   * 実効の特性の効果（特性の上書き・いえき・かがくへんかガスを反映。効いていなければ undefined）
   */
  private async abilityEffectOf(status: BattlePokemonStatus): Promise<IAbilityEffect | undefined> {
    const abilityName = (await resolveBattlePokemonTraits(status, this.traitsDeps()))?.abilityName;
    return abilityName ? AbilityRegistry.get(abilityName) : undefined;
  }

  /**
   * 実効のタイプ・特性を引くリポジトリ
   */
  private traitsDeps() {
    return {
      battleRepository: this.battleRepository,
      trainedPokemonRepository: this.trainedPokemonRepository,
    };
  }

  /**
   * かけたポケモンがひんし・場にいない、逃げられない状態とバインド状態を除いた状態
   * 本家の trapped（linked volatile）・partiallytrapped の onTrapPokemon は、かけたポケモンが場にいるときだけ効く
   */
  private async withoutReleasedTraps(state: VolatileState): Promise<VolatileState> {
    const isGone = async (statusId: number | undefined): Promise<boolean> => {
      if (statusId === undefined) {
        return false;
      }
      const source = await this.battleRepository.findBattlePokemonStatusById(statusId);
      return !source || !source.isActive || source.isFainted();
    };
    const patch: StatePatch<VolatileState> = {
      ...((await isGone(state.trappedByStatusId)) ? { trappedByStatusId: null } : {}),
      ...((await isGone(state.partialTrap?.sourceStatusId)) ? { partialTrap: null } : {}),
    };
    return updateVolatileState(state, patch);
  }

  /**
   * ポケモンを交代
   * @param battle バトル
   * @param trainerId トレーナーID
   * @param trainedPokemonId 交代するポケモンのTrainedPokemonID
   * @param options バトンタッチ・しっぽきりで引き継ぐもの（引っ込む前の状態を読み、場に出たポケモンに書く）
   * @returns 場に出たときのメッセージ（いやしのねがい・設置技）
   *
   * 場に出たポケモンには、いやしのねがい・みかづきのまい → 設置技（EntryEffectProcessor）→ 特性の onEntry の順に
   * 効果を与える。設置技でひんしになったら onEntry は呼ばない
   */
  async executeSwitch(
    battle: Battle,
    trainerId: number,
    trainedPokemonId: number,
    options: SwitchOptions = {},
  ): Promise<string[]> {
    // 現在のアクティブなポケモンを非アクティブにする
    const currentActive = await this.battleRepository.findActivePokemonByBattleIdAndTrainerId(
      battle.id,
      trainerId,
    );

    if (currentActive) {
      // 特性のOnSwitchOut効果を発動（状態異常解除前に実行。特性の上書き・いえきを反映した実効の特性）
      const abilityEffect = await this.abilityEffectOf(currentActive);
      if (abilityEffect?.onSwitchOut) {
        await abilityEffect.onSwitchOut(currentActive, {
          battle,
          battleRepository: this.battleRepository,
          trainedPokemonRepository: this.trainedPokemonRepository,
        });
      }

      // 状態異常を解除（交代時に解除されるもの）
      const statusCondition = StatusConditionHandler.isClearedOnSwitch(
        currentActive.statusCondition,
      )
        ? StatusCondition.None
        : currentActive.statusCondition;

      // 場に出ている間だけの状態（volatileState）と能力ランクはすべて消す（本家の clearVolatile）。
      // 交代しても残る状態は persistentState にあるので、ここでは触らない。
      // バトンタッチは、この書き込みの前に読んだ currentActive から能力ランクを引き継ぐ
      await this.battleRepository.updateBattlePokemonStatus(currentActive.id, {
        isActive: false,
        statusCondition,
        ...this.resetRanks(),
        volatileState: clearVolatileOnSwitchOut(),
      });

      // 注: もうどく・ねむりのターン数はStatusConditionProcessorServiceで管理されているが、
      // 交代時に状態異常が解除されるため、ターン数の追跡自体が不要となる
    }

    // 新しいポケモンをアクティブにする
    const battleStatuses = await this.battleRepository.findBattlePokemonStatusByBattleId(battle.id);

    // 引っ込んだポケモンによる、ほかのポケモンの逃げられない状態・メロメロを消し、出したゲンシ天候を終わらせる
    if (currentActive) {
      await this.releaseReferencesTo(currentActive.id, battleStatuses);
      await this.releasePrimalWeather(battle.id, currentActive.id);
    }

    const targetStatus = battleStatuses.find(
      s => s.trainedPokemonId === trainedPokemonId && s.trainerId === trainerId,
    );

    if (!targetStatus) {
      throw new NotFoundException(
        'BattlePokemonStatus',
        `trainedPokemonId: ${trainedPokemonId}, trainerId: ${trainerId}`,
      );
    }

    // 場に出たターンを書く（ねこだまし・たたみがえし・はりこみなどが読む）。
    // バトンタッチ・しっぽきりなら、引っ込む前の状態から引き継ぐものも書く
    await this.battleRepository.updateBattlePokemonStatus(targetStatus.id, {
      isActive: true,
      ...(options.transfer === 'batonPass' && currentActive
        ? this.batonPassRanks(currentActive)
        : {}),
      volatileState: updateVolatileState(targetStatus.volatileState, {
        ...this.transferPatch(currentActive, options),
        switchedInTurn: battle.turn,
      }),
    });

    // いやしのねがい・みかづきのまいと設置技。ひんしになったら、場に出たときの特性は発動しない
    const entryMessages = await this.entryEffects.apply(battle.id, targetStatus.id);
    const entered = await this.battleRepository.findBattlePokemonStatusById(targetStatus.id);
    if (entered?.isFainted()) {
      return entryMessages;
    }
    // 設置技で HP が半分以下になったききかいひ・にげごしは、すぐにまた交代する
    if (entered) {
      await this.scheduleEmergencyExits(battle.id, new Map([[entered.id, targetStatus.currentHp]]));
    }

    // 特性のOnEntry効果を発動（相手のかがくへんかガスで消えていれば発動しない）
    const abilityEffect = entered ? await this.abilityEffectOf(entered) : undefined;
    if (abilityEffect?.onEntry) {
      // 相手の特性（クリアボディ・ばんけんなど）を調べられるよう、育成ポケモンリポジトリも渡す
      await abilityEffect.onEntry(targetStatus, {
        battle,
        battleRepository: this.battleRepository,
        trainedPokemonRepository: this.trainedPokemonRepository,
      });
    }
    return entryMessages;
  }

  /**
   * ききかいひ・にげごし（特性の switchesOutBelowHalfHp）: 技以外のダメージ（設置技・ターン終了時）で HP が
   * 最大 HP の半分より上から半分以下になった場のポケモンに、控えがいれば pendingChoice（emergencyExit）を書く
   * 交代そのものは ExecuteTurnUseCase が行う
   * @param hpBefore ダメージを受ける前の HP（BattlePokemonStatus の ID ごと）
   */
  async scheduleEmergencyExits(
    battleId: number,
    hpBefore: ReadonlyMap<number, number>,
  ): Promise<void> {
    const statuses =
      (await this.battleRepository.findBattlePokemonStatusByBattleId(battleId)) ?? [];
    for (const status of statuses) {
      const before = hpBefore.get(status.id);
      if (before === undefined || !status.isActive || !crossesHalfHp(status, before)) {
        continue;
      }
      if ((await this.abilityEffectOf(status))?.switchesOutBelowHalfHp !== true) {
        continue;
      }
      if (findSwitchTargets(statuses, status.trainerId).length === 0) {
        continue;
      }
      await this.battleRepository.patchSideConditions(battleId, status.trainerId, {
        pendingChoice: { reason: 'emergencyExit' },
      });
    }
  }

  /**
   * 引き継ぐ一時的な状態の patch（引き継がないときは空）
   */
  private transferPatch(
    leaving: BattlePokemonStatus | null,
    options: SwitchOptions,
  ): StatePatch<VolatileState> {
    if (!leaving || !options.transfer) {
      return {};
    }
    return options.transfer === 'batonPass'
      ? batonPassPatch(leaving.volatileState)
      : shedTailPatch(leaving.volatileState);
  }

  /**
   * すべての能力ランクを 0 にする書き込み（引っ込むとき）
   */
  private resetRanks(): Partial<BattlePokemonStatus> {
    const ranks: Partial<Record<(typeof RANK_KEYS)[number], number>> = {};
    for (const key of RANK_KEYS) {
      ranks[key] = 0;
    }
    return ranks;
  }

  /**
   * バトンタッチで引き継ぐ能力ランク
   */
  private batonPassRanks(leaving: BattlePokemonStatus): Partial<BattlePokemonStatus> {
    const ranks: Partial<Record<(typeof RANK_KEYS)[number], number>> = {};
    for (const key of RANK_KEYS) {
      ranks[key] = leaving[key];
    }
    return ranks;
  }

  /**
   * 場を離れたポケモンを指している、ほかのポケモンの状態を消す
   * statuses は場を離れたあとに読み直した一覧を渡す
   */
  private async releaseReferencesTo(
    leavingStatusId: number,
    statuses: readonly BattlePokemonStatus[],
  ): Promise<void> {
    for (const status of statuses) {
      if (status.id === leavingStatusId) {
        continue;
      }
      const released = releaseVolatileReferencesTo(status.volatileState, leavingStatusId);
      if (released !== status.volatileState) {
        await this.battleRepository.updateBattlePokemonStatus(status.id, {
          volatileState: released,
        });
      }
    }
  }
}
