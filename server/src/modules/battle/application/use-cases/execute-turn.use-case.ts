import { Injectable, Inject } from '@nestjs/common';
import {
  IBattleRepository,
  BATTLE_REPOSITORY_TOKEN,
} from '../../domain/battle.repository.interface';
import { Battle, BattleStatus } from '../../domain/entities/battle.entity';
import { StatusCondition } from '../../domain/entities/status-condition.enum';
import { StatusConditionHandler } from '../../domain/logic/status-condition-handler';
import {
  NotFoundException,
  InvalidStateException,
} from '@/shared/domain/exceptions';
import { ActionOrderDeterminerService } from '../services/action-order-determiner.service';
import { WinnerCheckerService } from '../services/winner-checker.service';
import { StatusConditionProcessorService } from '../services/status-condition-processor.service';
import { PokemonSwitcherService } from '../services/pokemon-switcher.service';
import { MoveExecutorService } from '../services/move-executor.service';

/**
 * ターン実行の入力パラメータ
 */
export interface ExecuteTurnParams {
  battleId: number;
  trainer1Action: {
    trainerId: number;
    moveId?: number; // 技を使用する場合
    switchPokemonId?: number; // ポケモンを交代する場合
  };
  trainer2Action: {
    trainerId: number;
    moveId?: number; // 技を使用する場合
    switchPokemonId?: number; // ポケモンを交代する場合
  };
}

/**
 * ターン実行の結果
 */
export interface ExecuteTurnResult {
  battle: Battle;
  actions: Array<{
    trainerId: number;
    action: string; // 'move' | 'switch'
    result: string; // 行動結果の説明
  }>;
  winnerTrainerId?: number; // 勝者が決まった場合
}

/**
 * ExecuteTurnUseCase
 * ターン処理のロジックを実行するユースケース
 *
 * 処理内容:
 * 1. 行動順の決定（速度と優先度を考慮）
 * 2. 行動の実行（技の実行またはポケモン交代）
 * 3. ダメージ計算
 * 4. 特性効果の処理
 * 5. 勝敗判定
 */
@Injectable()
export class ExecuteTurnUseCase {
  constructor(
    @Inject(BATTLE_REPOSITORY_TOKEN)
    private readonly battleRepository: IBattleRepository,
    private readonly actionOrderDeterminer: ActionOrderDeterminerService,
    private readonly winnerChecker: WinnerCheckerService,
    private readonly statusConditionProcessor: StatusConditionProcessorService,
    private readonly pokemonSwitcher: PokemonSwitcherService,
    private readonly moveExecutor: MoveExecutorService,
  ) {}

  /**
   * ターンを実行
   */
  async execute(params: ExecuteTurnParams): Promise<ExecuteTurnResult> {
    const battle = await this.battleRepository.findById(params.battleId);
    if (!battle) {
      throw new NotFoundException('Battle', params.battleId);
    }

    if (battle.status !== 'Active') {
      throw new InvalidStateException(
        `Battle is not active. Current status: ${battle.status}`,
        battle.status,
      );
    }

    // アクティブなポケモンを取得
    const trainer1Active = await this.battleRepository.findActivePokemonByBattleIdAndTrainerId(
      battle.id,
      params.trainer1Action.trainerId,
    );
    const trainer2Active = await this.battleRepository.findActivePokemonByBattleIdAndTrainerId(
      battle.id,
      params.trainer2Action.trainerId,
    );

    if (!trainer1Active || !trainer2Active) {
      throw new NotFoundException('Active pokemon');
    }

    // 行動順を決定
    const actions = await this.actionOrderDeterminer.determine({
      battle,
      trainer1Action: params.trainer1Action,
      trainer2Action: params.trainer2Action,
      trainer1Active,
      trainer2Active,
    });

    const actionResults: Array<{ trainerId: number; action: string; result: string }> = [];

    // 行動を順番に実行
    for (const action of actions) {
      if (action.action === 'move' && action.moveId) {
        const attacker =
          action.trainerId === params.trainer1Action.trainerId ? trainer1Active : trainer2Active;
        const defender =
          action.trainerId === params.trainer1Action.trainerId ? trainer2Active : trainer1Active;

        // PPチェック(PPが0の場合は使用不可)
        const battlePokemonMoves =
          await this.battleRepository.findBattlePokemonMovesByBattlePokemonStatusId(attacker.id);
        const battlePokemonMove = battlePokemonMoves.find(bpm => bpm.moveId === action.moveId);
        if (!battlePokemonMove) {
          actionResults.push({
            trainerId: action.trainerId,
            action: 'move',
            result: `Move not found in battle pokemon moves (moveId: ${action.moveId}, battlePokemonStatusId: ${attacker.id})`,
          });
          continue;
        }
        if (battlePokemonMove.isPpExhausted()) {
          actionResults.push({
            trainerId: action.trainerId,
            action: 'move',
            result: 'Move has no PP left',
          });
          continue;
        }

        // 状態異常による行動不能判定
        if (!StatusConditionHandler.canAct(attacker)) {
          // こおりの場合は解除判定を行う
          if (
            attacker.statusCondition === StatusCondition.Freeze &&
            StatusConditionHandler.shouldClearFreeze()
          ) {
            await this.battleRepository.updateBattlePokemonStatus(attacker.id, {
              statusCondition: StatusCondition.None,
            });
            actionResults.push({
              trainerId: action.trainerId,
              action: 'move',
              result: 'Pokemon thawed out and can act',
            });
            // 解除されたので行動を続行
            const result = await this.moveExecutor.executeMove(
              battle,
              action.trainerId,
              action.moveId,
              attacker,
              defender,
              battlePokemonMove.id,
            );
            actionResults.push({
              trainerId: action.trainerId,
              action: 'move',
              result,
            });
          } else {
            // 行動不能
            const statusMessage = this.statusConditionProcessor.getStatusConditionMessage(
              attacker.statusCondition,
            );
            actionResults.push({
              trainerId: action.trainerId,
              action: 'move',
              result: `Cannot act due to ${statusMessage}`,
            });
          }
        } else {
          const result = await this.moveExecutor.executeMove(
            battle,
            action.trainerId,
            action.moveId,
            attacker,
            defender,
            battlePokemonMove.id,
          );
          actionResults.push({
            trainerId: action.trainerId,
            action: 'move',
            result,
          });
        }

        // 勝敗判定
        const winner = await this.winnerChecker.checkWinner(battle.id);
        if (winner) {
          await this.battleRepository.update(battle.id, {
            status: BattleStatus.Completed,
            winnerTrainerId: winner,
          });
          return {
            battle: (await this.battleRepository.findById(battle.id)) as Battle,
            actions: actionResults,
            winnerTrainerId: winner,
          };
        }
      } else if (action.action === 'switch' && action.switchPokemonId) {
        await this.pokemonSwitcher.executeSwitch(battle, action.trainerId, action.switchPokemonId);
        actionResults.push({
          trainerId: action.trainerId,
          action: 'switch',
          result: `Pokemon switched to ID: ${action.switchPokemonId}`,
        });
      }
    }

    // ターン終了時の特性効果を処理
    await this.statusConditionProcessor.processTurnEndAbilities(battle);

    // ターン数を増やす
    const updatedBattle = await this.battleRepository.update(battle.id, {
      turn: battle.turn + 1,
    });

    return {
      battle: updatedBattle,
      actions: actionResults,
    };
  }
}
