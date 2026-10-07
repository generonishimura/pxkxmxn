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
import { createMoveOrderContext } from '../../domain/logic/move-order-context';
import { NotFoundException } from '@/shared/domain/exceptions';
// 場の状態・設置技・交代の仕組み（Issue #107 一部）
import { getSideConditions } from '../../domain/state/side-state';
import {
  isTrickRoomActive,
  movesBefore,
  sideSpeedMultiplier,
} from '../../domain/logic/field-modifiers';
// タイプ変更・フォルムチェンジ・特性の書き換えの仕組み（Issue #119 #135 一部）
import {
  BattlePokemonRef,
  battleAbilityNameOf,
  battleStatsOf,
} from '../../domain/logic/battle-pokemon-traits';

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
 * 3. 優先度が異なる場合は優先度が高い方が先（特性の modifyFractionalPriority で、同じ優先度の中の順番を変えられる）
 * 4. 優先度が同じ場合は速度が高い方が先（おいかぜの陣営は素早さ 2 倍。トリックルームの間は遅い方が先）
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

    // 行動するポケモンごとのコンテキスト（技の情報・効果のある天候・実数値を含む）
    // 実効の特性（特性の上書き・いえき・かがくへんかガスを反映）と、フォルム・実数値の上書きを反映した実数値
    const refs = [
      trainer1TrainedPokemon
        ? { trainedPokemon: trainer1TrainedPokemon, status: trainer1Active }
        : null,
      trainer2TrainedPokemon
        ? { trainedPokemon: trainer2TrainedPokemon, status: trainer2Active }
        : null,
    ].filter((ref): ref is BattlePokemonRef => ref !== null);
    const trainer1AbilityName = trainer1TrainedPokemon
      ? battleAbilityNameOf(trainer1TrainedPokemon, trainer1Active, refs)
      : undefined;
    const trainer2AbilityName = trainer2TrainedPokemon
      ? battleAbilityNameOf(trainer2TrainedPokemon, trainer2Active, refs)
      : undefined;
    const trainer1AbilityEffect = trainer1AbilityName
      ? AbilityRegistry.get(trainer1AbilityName)
      : undefined;
    const trainer2AbilityEffect = trainer2AbilityName
      ? AbilityRegistry.get(trainer2AbilityName)
      : undefined;
    const trainer1Context = createMoveOrderContext({
      battle,
      move: trainer1Move,
      pokemon: trainer1Active,
      abilityName: trainer1AbilityName,
      opponentAbilityName: trainer2AbilityName,
      stats: trainer1TrainedPokemon
        ? battleStatsOf(trainer1TrainedPokemon, trainer1Active)
        : undefined,
    });
    const trainer2Context = createMoveOrderContext({
      battle,
      move: trainer2Move,
      pokemon: trainer2Active,
      abilityName: trainer2AbilityName,
      opponentAbilityName: trainer1AbilityName,
      stats: trainer2TrainedPokemon
        ? battleStatsOf(trainer2TrainedPokemon, trainer2Active)
        : undefined,
    });

    let trainer1Priority = trainer1Move.priority;
    let trainer2Priority = trainer2Move.priority;

    if (trainer1AbilityEffect?.modifyPriority) {
      const modifiedPriority = trainer1AbilityEffect.modifyPriority(
        trainer1Active,
        trainer1Move.priority,
        trainer1Context,
      );
      if (modifiedPriority !== undefined) {
        trainer1Priority = modifiedPriority;
      }
    }

    if (trainer2AbilityEffect?.modifyPriority) {
      const modifiedPriority = trainer2AbilityEffect.modifyPriority(
        trainer2Active,
        trainer2Move.priority,
        trainer2Context,
      );
      if (modifiedPriority !== undefined) {
        trainer2Priority = modifiedPriority;
      }
    }

    // 同じ優先度の中での順番（きんしのちから・あとだし・クイックドロウ。本家の onFractionalPriority）
    const trainer1FractionalPriority = trainer1AbilityEffect?.modifyFractionalPriority?.(
      trainer1Active,
      trainer1Context,
    );
    const trainer2FractionalPriority = trainer2AbilityEffect?.modifyFractionalPriority?.(
      trainer2Active,
      trainer2Context,
    );
    trainer1Priority += trainer1FractionalPriority ?? 0;
    trainer2Priority += trainer2FractionalPriority ?? 0;

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
      if (trainer1AbilityEffect?.modifySpeed) {
        const modifiedSpeed = trainer1AbilityEffect.modifySpeed(
          trainer1Active,
          finalTrainer1Speed,
          trainer1Context,
        );
        if (modifiedSpeed !== undefined) {
          finalTrainer1Speed = modifiedSpeed;
        }
      }

      if (trainer2AbilityEffect?.modifySpeed) {
        const modifiedSpeed = trainer2AbilityEffect.modifySpeed(
          trainer2Active,
          finalTrainer2Speed,
          trainer2Context,
        );
        if (modifiedSpeed !== undefined) {
          finalTrainer2Speed = modifiedSpeed;
        }
      }

      // おいかぜ（陣営の素早さ 2 倍）
      finalTrainer1Speed *= sideSpeedMultiplier(
        getSideConditions(battle.sideState, trainer1Action.trainerId),
      );
      finalTrainer2Speed *= sideSpeedMultiplier(
        getSideConditions(battle.sideState, trainer2Action.trainerId),
      );

      // 速度比較（トリックルームの間は遅い方が先）
      if (
        movesBefore(finalTrainer1Speed, finalTrainer2Speed, isTrickRoomActive(battle.sideState))
      ) {
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

    // フォルムの種族値で計算し、スピードスワップ・へんしんなどの実数値の上書き → ランク補正の順に適用
    const speed = battleStatsOf(trainedPokemon, status).speed;
    const multiplier = status.getStatMultiplier('speed');
    return Math.floor(speed * multiplier);
  }
}
