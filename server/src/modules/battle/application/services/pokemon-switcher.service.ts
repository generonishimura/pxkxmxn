import { Injectable, Inject } from '@nestjs/common';
import { Battle } from '../../domain/entities/battle.entity';
import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import {
  clearVolatileOnSwitchOut,
  releaseVolatileReferencesTo,
  updateVolatileState,
} from '../../domain/state/volatile-state';
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
   * ポケモンを交代
   * @param battle バトル
   * @param trainerId トレーナーID
   * @param trainedPokemonId 交代するポケモンのTrainedPokemonID
   */
  async executeSwitch(battle: Battle, trainerId: number, trainedPokemonId: number): Promise<void> {
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

    // 場に出たターンを書く（ねこだまし・たたみがえし・はりこみなどが読む）
    await this.battleRepository.updateBattlePokemonStatus(targetStatus.id, {
      isActive: true,
      volatileState: updateVolatileState(targetStatus.volatileState, {
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
