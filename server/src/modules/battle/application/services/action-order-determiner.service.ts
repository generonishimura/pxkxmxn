import { Injectable, Inject } from '@nestjs/common';
import { Battle } from '../../domain/entities/battle.entity';
import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '../../domain/entities/status-condition.enum';
import {
  IMoveRepository,
  MOVE_REPOSITORY_TOKEN,
} from '@/modules/pokemon/domain/pokemon.repository.interface';
import {
  ITrainedPokemonRepository,
  TRAINED_POKEMON_REPOSITORY_TOKEN,
} from '@/modules/trainer/domain/trainer.repository.interface';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { StatCalculator } from '../../domain/logic/stat-calculator';
import { NotFoundException } from '@/shared/domain/exceptions';

/**
 * 行動順決定の入力パラメータ
 */
export interface ActionOrderParams {
  battle: Battle;
  trainer1Action: {
    trainerId: number;
    moveId?: number;
    switchPokemonId?: number;
  };
  trainer2Action: {
    trainerId: number;
    moveId?: number;
    switchPokemonId?: number;
  };
  trainer1Active: BattlePokemonStatus;
  trainer2Active: BattlePokemonStatus;
}

/**
 * 決定された行動
 */
export interface DeterminedAction {
  trainerId: number;
  action: 'move' | 'switch';
  moveId?: number;
  switchPokemonId?: number;
}

/**
 * ActionOrderDeterminerService
 * バトル中の行動順を決定するサービス
 *
 * 決定ルール:
 * 1. ポケモン交代は常に先に実行
 * 2. 技を使用する場合、優先度と速度を考慮
 * 3. 優先度が異なる場合は優先度が高い方が先
 * 4. 優先度が同じ場合は速度が高い方が先
 */
@Injectable()
export class ActionOrderDeterminerService {
  /**
   * まひによる素早さ補正倍率
   */
  private static readonly PARALYSIS_SPEED_MULTIPLIER = 0.5;

  /**
   * まひ以外の素早さ補正倍率
   */
  private static readonly NORMAL_SPEED_MULTIPLIER = 1.0;

  constructor(
    @Inject(MOVE_REPOSITORY_TOKEN)
    private readonly moveRepository: IMoveRepository,
    @Inject(TRAINED_POKEMON_REPOSITORY_TOKEN)
    private readonly trainedPokemonRepository: ITrainedPokemonRepository,
  ) {}

  /**
   * 行動順を決定
   */
  async determine(params: ActionOrderParams): Promise<DeterminedAction[]> {
    const actions: DeterminedAction[] = [];

    // ポケモン交代は常に先に実行
    if (params.trainer1Action.switchPokemonId) {
      actions.push({
        trainerId: params.trainer1Action.trainerId,
        action: 'switch',
        switchPokemonId: params.trainer1Action.switchPokemonId,
      });
    }
    if (params.trainer2Action.switchPokemonId) {
      actions.push({
        trainerId: params.trainer2Action.trainerId,
        action: 'switch',
        switchPokemonId: params.trainer2Action.switchPokemonId,
      });
    }

    // 両方が技を使用する場合、優先度と速度を考慮
    if (params.trainer1Action.moveId && params.trainer2Action.moveId) {
      const moveActions = await this.determineMoveOrder(
        params.battle,
        params.trainer1Action,
        params.trainer2Action,
        params.trainer1Active,
        params.trainer2Active,
      );
      actions.push(...moveActions);
    } else if (params.trainer1Action.moveId) {
      actions.push({
        trainerId: params.trainer1Action.trainerId,
        action: 'move',
        moveId: params.trainer1Action.moveId,
      });
    } else if (params.trainer2Action.moveId) {
      actions.push({
        trainerId: params.trainer2Action.trainerId,
        action: 'move',
        moveId: params.trainer2Action.moveId,
      });
    }

    return actions;
  }

  /**
   * 技の行動順を決定（優先度と速度を考慮）
   */
  private async determineMoveOrder(
    battle: Battle,
    trainer1Action: ActionOrderParams['trainer1Action'],
    trainer2Action: ActionOrderParams['trainer2Action'],
    trainer1Active: BattlePokemonStatus,
    trainer2Active: BattlePokemonStatus,
  ): Promise<DeterminedAction[]> {
    // 技の優先度を取得
    const trainer1Move = await this.moveRepository.findById(trainer1Action.moveId!);
    const trainer2Move = await this.moveRepository.findById(trainer2Action.moveId!);

    if (!trainer1Move || !trainer2Move) {
      const missingMoveId = !trainer1Move ? trainer1Action.moveId : trainer2Action.moveId;
      throw new NotFoundException('Move', missingMoveId);
    }

    // 特性による優先度補正を適用
    const trainer1TrainedPokemon = await this.trainedPokemonRepository.findById(
      trainer1Active.trainedPokemonId,
    );
    const trainer2TrainedPokemon = await this.trainedPokemonRepository.findById(
      trainer2Active.trainedPokemonId,
    );

    const battleContext = {
      battle,
      weather: battle.weather,
      field: battle.field,
    };

    let trainer1Priority = trainer1Move.priority;
    let trainer2Priority = trainer2Move.priority;

    if (trainer1TrainedPokemon?.ability) {
      const abilityEffect = AbilityRegistry.get(trainer1TrainedPokemon.ability.name);
      if (abilityEffect?.modifyPriority) {
        const modifiedPriority = abilityEffect.modifyPriority(
          trainer1Active,
          trainer1Move.priority,
          battleContext,
        );
        if (modifiedPriority !== undefined) {
          trainer1Priority = modifiedPriority;
        }
      }
    }

    if (trainer2TrainedPokemon?.ability) {
      const abilityEffect = AbilityRegistry.get(trainer2TrainedPokemon.ability.name);
      if (abilityEffect?.modifyPriority) {
        const modifiedPriority = abilityEffect.modifyPriority(
          trainer2Active,
          trainer2Move.priority,
          battleContext,
        );
        if (modifiedPriority !== undefined) {
          trainer2Priority = modifiedPriority;
        }
      }
    }

    // 優先度が異なる場合は優先度が高い方が先
    if (trainer1Priority !== trainer2Priority) {
      if (trainer1Priority > trainer2Priority) {
        return [
          {
            trainerId: trainer1Action.trainerId,
            action: 'move',
            moveId: trainer1Action.moveId,
          },
          {
            trainerId: trainer2Action.trainerId,
            action: 'move',
            moveId: trainer2Action.moveId,
          },
        ];
      } else {
        return [
          {
            trainerId: trainer2Action.trainerId,
            action: 'move',
            moveId: trainer2Action.moveId,
          },
          {
            trainerId: trainer1Action.trainerId,
            action: 'move',
            moveId: trainer1Action.moveId,
          },
        ];
      }
    } else {
      // 優先度が同じ場合は速度で判定
      const trainer1Speed = await this.getEffectiveSpeed(trainer1Active);
      const trainer2Speed = await this.getEffectiveSpeed(trainer2Active);

      // まひ状態異常の場合は素早さが0.5倍
      const trainer1SpeedMultiplier =
        trainer1Active.statusCondition === StatusCondition.Paralysis
          ? ActionOrderDeterminerService.PARALYSIS_SPEED_MULTIPLIER
          : ActionOrderDeterminerService.NORMAL_SPEED_MULTIPLIER;
      const trainer2SpeedMultiplier =
        trainer2Active.statusCondition === StatusCondition.Paralysis
          ? ActionOrderDeterminerService.PARALYSIS_SPEED_MULTIPLIER
          : ActionOrderDeterminerService.NORMAL_SPEED_MULTIPLIER;

      let finalTrainer1Speed = trainer1Speed * trainer1SpeedMultiplier;
      let finalTrainer2Speed = trainer2Speed * trainer2SpeedMultiplier;

      // 特性による速度補正を適用
      if (trainer1TrainedPokemon?.ability) {
        const abilityEffect = AbilityRegistry.get(trainer1TrainedPokemon.ability.name);
        if (abilityEffect?.modifySpeed) {
          const modifiedSpeed = abilityEffect.modifySpeed(
            trainer1Active,
            finalTrainer1Speed,
            battleContext,
          );
          if (modifiedSpeed !== undefined) {
            finalTrainer1Speed = modifiedSpeed;
          }
        }
      }

      if (trainer2TrainedPokemon?.ability) {
        const abilityEffect = AbilityRegistry.get(trainer2TrainedPokemon.ability.name);
        if (abilityEffect?.modifySpeed) {
          const modifiedSpeed = abilityEffect.modifySpeed(
            trainer2Active,
            finalTrainer2Speed,
            battleContext,
          );
          if (modifiedSpeed !== undefined) {
            finalTrainer2Speed = modifiedSpeed;
          }
        }
      }

      // 速度比較
      if (finalTrainer1Speed >= finalTrainer2Speed) {
        return [
          {
            trainerId: trainer1Action.trainerId,
            action: 'move',
            moveId: trainer1Action.moveId,
          },
          {
            trainerId: trainer2Action.trainerId,
            action: 'move',
            moveId: trainer2Action.moveId,
          },
        ];
      } else {
        return [
          {
            trainerId: trainer2Action.trainerId,
            action: 'move',
            moveId: trainer2Action.moveId,
          },
          {
            trainerId: trainer1Action.trainerId,
            action: 'move',
            moveId: trainer1Action.moveId,
          },
        ];
      }
    }
  }

  /**
   * ランク補正を考慮した実効速度を取得
   */
  private async getEffectiveSpeed(status: BattlePokemonStatus): Promise<number> {
    // TrainedPokemon情報を取得
    const trainedPokemon = await this.trainedPokemonRepository.findById(status.trainedPokemonId);

    if (!trainedPokemon) {
      throw new NotFoundException('TrainedPokemon', status.trainedPokemonId);
    }

    // ステータスを計算
    const stats = StatCalculator.calculate({
      baseHp: trainedPokemon.pokemon.baseHp,
      baseAttack: trainedPokemon.pokemon.baseAttack,
      baseDefense: trainedPokemon.pokemon.baseDefense,
      baseSpecialAttack: trainedPokemon.pokemon.baseSpecialAttack,
      baseSpecialDefense: trainedPokemon.pokemon.baseSpecialDefense,
      baseSpeed: trainedPokemon.pokemon.baseSpeed,
      level: trainedPokemon.level,
      ivHp: trainedPokemon.ivHp,
      ivAttack: trainedPokemon.ivAttack,
      ivDefense: trainedPokemon.ivDefense,
      ivSpecialAttack: trainedPokemon.ivSpecialAttack,
      ivSpecialDefense: trainedPokemon.ivSpecialDefense,
      ivSpeed: trainedPokemon.ivSpeed,
      evHp: trainedPokemon.evHp,
      evAttack: trainedPokemon.evAttack,
      evDefense: trainedPokemon.evDefense,
      evSpecialAttack: trainedPokemon.evSpecialAttack,
      evSpecialDefense: trainedPokemon.evSpecialDefense,
      evSpeed: trainedPokemon.evSpeed,
      nature: trainedPokemon.nature,
    });

    // ランク補正を適用
    const multiplier = status.getStatMultiplier('speed');
    return Math.floor(stats.speed * multiplier);
  }
}

