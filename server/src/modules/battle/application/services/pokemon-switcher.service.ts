import { Injectable, Inject } from '@nestjs/common';
import { Battle } from '../../domain/entities/battle.entity';
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
  async executeSwitch(
    battle: Battle,
    trainerId: number,
    trainedPokemonId: number,
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

      await this.battleRepository.updateBattlePokemonStatus(currentActive.id, {
        isActive: false,
        statusCondition,
      });

      // 注: もうどく・ねむりのターン数はStatusConditionProcessorServiceで管理されているが、
      // 交代時に状態異常が解除されるため、ターン数の追跡自体が不要となる
    }

    // 新しいポケモンをアクティブにする
    const battleStatuses = await this.battleRepository.findBattlePokemonStatusByBattleId(battle.id);
    const targetStatus = battleStatuses.find(
      s => s.trainedPokemonId === trainedPokemonId && s.trainerId === trainerId,
    );

    if (!targetStatus) {
      throw new NotFoundException('BattlePokemonStatus', `trainedPokemonId: ${trainedPokemonId}, trainerId: ${trainerId}`);
    }

    await this.battleRepository.updateBattlePokemonStatus(targetStatus.id, {
      isActive: true,
    });

    // 特性のOnEntry効果を発動
    const trainedPokemon = await this.trainedPokemonRepository.findById(trainedPokemonId);

    if (trainedPokemon?.ability) {
      const abilityEffect = AbilityRegistry.get(trainedPokemon.ability.name);
      if (abilityEffect?.onEntry) {
        await abilityEffect.onEntry(targetStatus, {
          battle,
          battleRepository: this.battleRepository,
        });
      }
    }
  }
}

