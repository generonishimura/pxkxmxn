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
import { NotFoundException } from '@/shared/domain/exceptions';

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
 * バトンタッチで引き継ぐ能力ランクの列
 */
const BATON_PASS_RANK_KEYS = [
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
  constructor(
    @Inject(BATTLE_REPOSITORY_TOKEN)
    private readonly battleRepository: IBattleRepository,
    @Inject(TRAINED_POKEMON_REPOSITORY_TOKEN)
    private readonly trainedPokemonRepository: ITrainedPokemonRepository,
  ) {}

  /**
   * 交代できない理由を返す（交代できるなら undefined）
   * ねをはる・逃げられない状態・バインド状態を見る。ゴーストタイプは、ねをはる以外では交代できる。
   * かけたポケモンがひんし・場にいない、逃げられない状態とバインド状態は見ない
   * @param active 交代しようとしている場のポケモン
   */
  async findSwitchBlocker(active: BattlePokemonStatus): Promise<SwitchBlocker | undefined> {
    const state = active.volatileState;
    if (
      state.ingrain === undefined &&
      state.trappedByStatusId === undefined &&
      state.partialTrap === undefined
    ) {
      return undefined;
    }
    const trainedPokemon = await this.trainedPokemonRepository.findById(active.trainedPokemonId);
    const typeNames = [
      trainedPokemon?.pokemon.primaryType.name,
      trainedPokemon?.pokemon.secondaryType?.name,
    ].filter((name): name is string => name !== undefined);
    return findSwitchBlocker(await this.withoutReleasedTraps(state), typeNames);
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
   */
  async executeSwitch(
    battle: Battle,
    trainerId: number,
    trainedPokemonId: number,
    options: SwitchOptions = {},
  ): Promise<void> {
    // 現在のアクティブなポケモンを非アクティブにする
    const currentActive = await this.battleRepository.findActivePokemonByBattleIdAndTrainerId(
      battle.id,
      trainerId,
    );

    if (currentActive) {
      // 特性のOnSwitchOut効果を発動（状態異常解除前に実行）
      const currentTrainedPokemon = await this.trainedPokemonRepository.findById(
        currentActive.trainedPokemonId,
      );
      if (currentTrainedPokemon?.ability) {
        const abilityEffect = AbilityRegistry.get(currentTrainedPokemon.ability.name);
        if (abilityEffect?.onSwitchOut) {
          await abilityEffect.onSwitchOut(currentActive, {
            battle,
            battleRepository: this.battleRepository,
          });
        }
      }

      // 状態異常を解除（交代時に解除されるもの）
      const statusCondition = StatusConditionHandler.isClearedOnSwitch(
        currentActive.statusCondition,
      )
        ? StatusCondition.None
        : currentActive.statusCondition;

      // 場に出ている間だけの状態（volatileState）はすべて消す。交代しても残る状態は
      // persistentState にあるので、ここでは触らない
      await this.battleRepository.updateBattlePokemonStatus(currentActive.id, {
        isActive: false,
        statusCondition,
        volatileState: clearVolatileOnSwitchOut(),
      });

      // 注: もうどく・ねむりのターン数はStatusConditionProcessorServiceで管理されているが、
      // 交代時に状態異常が解除されるため、ターン数の追跡自体が不要となる
    }

    // 新しいポケモンをアクティブにする
    const battleStatuses = await this.battleRepository.findBattlePokemonStatusByBattleId(battle.id);

    // 引っ込んだポケモンによる、ほかのポケモンの逃げられない状態・メロメロを消す
    if (currentActive) {
      await this.releaseReferencesTo(currentActive.id, battleStatuses);
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

    // 特性のOnEntry効果を発動
    const trainedPokemon = await this.trainedPokemonRepository.findById(trainedPokemonId);

    if (trainedPokemon?.ability) {
      const abilityEffect = AbilityRegistry.get(trainedPokemon.ability.name);
      if (abilityEffect?.onEntry) {
        // 相手の特性（クリアボディ・ばんけんなど）を調べられるよう、育成ポケモンリポジトリも渡す
        await abilityEffect.onEntry(targetStatus, {
          battle,
          battleRepository: this.battleRepository,
          trainedPokemonRepository: this.trainedPokemonRepository,
        });
      }
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
   * バトンタッチで引き継ぐ能力ランク
   */
  private batonPassRanks(leaving: BattlePokemonStatus): Partial<BattlePokemonStatus> {
    const ranks: Partial<Record<(typeof BATON_PASS_RANK_KEYS)[number], number>> = {};
    for (const key of BATON_PASS_RANK_KEYS) {
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
