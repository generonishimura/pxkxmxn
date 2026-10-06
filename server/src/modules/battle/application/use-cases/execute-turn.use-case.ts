import { Injectable, Inject } from '@nestjs/common';
import {
  IBattleRepository,
  BATTLE_REPOSITORY_TOKEN,
} from '../../domain/battle.repository.interface';
import { Battle, BattleStatus } from '../../domain/entities/battle.entity';
import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import { isEmptyObject } from '../../domain/state/state-field-parser';
import {
  clearVolatileOnSwitchOut,
  tickVolatileStateAtTurnEnd,
} from '../../domain/state/volatile-state';
import { tickSideStateAtTurnEnd } from '../../domain/state/side-state';
import { NotFoundException, InvalidStateException } from '@/shared/domain/exceptions';
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
    for (const [actionIndex, action] of actions.entries()) {
      // 先に行動した側が書いた状態（ちょうはつ・まもる・壁・天候・交代など）が見えるよう、
      // 行動のたびにバトルと場のポケモンを読み直す。状態の JSON 列は丸ごと書き換わるので、
      // ターンの最初に読んだ古い値を使うと判定を誤り、書き込むと先に書かれたキーが消える
      const currentBattle = await this.findBattle(battle.id);
      if (action.action === 'move' && action.moveId) {
        // このあとに相手の技が残っていなければ、最後に行動する（アナライズ）
        const isLastToMove = !actions
          .slice(actionIndex + 1)
          .some(next => next.action === 'move' && next.trainerId !== action.trainerId);
        const opponentTrainerId =
          action.trainerId === params.trainer1Action.trainerId
            ? params.trainer2Action.trainerId
            : params.trainer1Action.trainerId;
        const attacker = await this.findActivePokemon(battle.id, action.trainerId);
        const defender = await this.findActivePokemon(battle.id, opponentTrainerId);

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

        // ねむり・こおり・まひ・ひるみ・こんらんなど、技を出せるかの判定は MoveExecutorService が行う
        const result = await this.moveExecutor.executeMove(
          currentBattle,
          action.trainerId,
          action.moveId,
          attacker,
          defender,
          battlePokemonMove.id,
          { isLastToMove },
        );
        actionResults.push({
          trainerId: action.trainerId,
          action: 'move',
          result,
        });

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
        await this.pokemonSwitcher.executeSwitch(
          currentBattle,
          action.trainerId,
          action.switchPokemonId,
        );
        actionResults.push({
          trainerId: action.trainerId,
          action: 'switch',
          result: `Pokemon switched to ID: ${action.switchPokemonId}`,
        });
      }
    }

    // ターン終了時の特性効果を処理（行動で変わった天候なども見えるよう、読み直したバトルを渡す）
    const battleAtTurnEnd = await this.findBattle(battle.id);
    await this.statusConditionProcessor.processTurnEndAbilities(battleAtTurnEnd);

    // 状態の残りターン数を減らし、このターンだけの状態を消す。
    // 切れる直前の値（1）を読む効果は上のターン終了時の処理で済んでいるので、そのあとで行う
    await this.settleVolatileStatesAtTurnEnd(battle.id);

    // ターン終了時の処理が書いた sideState も残すよう、読み直してから減らす
    const battleBeforeNextTurn = await this.findBattle(battle.id);
    const tickedSideState = tickSideStateAtTurnEnd(battleBeforeNextTurn.sideState);

    // ターン数を増やす（sideState が変わったときだけ一緒に書く）
    const updatedBattle = await this.battleRepository.update(battle.id, {
      turn: battleBeforeNextTurn.turn + 1,
      ...(tickedSideState !== battleBeforeNextTurn.sideState ? { sideState: tickedSideState } : {}),
    });

    return {
      battle: updatedBattle,
      actions: actionResults,
    };
  }

  /**
   * ターン終了時に、場のポケモンの volatileState を片付ける
   * - ひんしのポケモンは、すべてのキーを消す（ほろびのうたのカウントやみがわりを持ち越さない）
   * - それ以外は、残りターン数を 1 減らし、このターンだけのフラグを消す
   * 変える所がないポケモンには書き込まない
   */
  private async settleVolatileStatesAtTurnEnd(battleId: number): Promise<void> {
    const statuses = await this.battleRepository.findBattlePokemonStatusByBattleId(battleId);
    for (const status of statuses.filter(s => s.isActive)) {
      if (status.isFainted()) {
        if (!isEmptyObject(status.volatileState)) {
          await this.battleRepository.updateBattlePokemonStatus(status.id, {
            volatileState: clearVolatileOnSwitchOut(),
          });
        }
        continue;
      }
      const ticked = tickVolatileStateAtTurnEnd(status.volatileState);
      if (ticked !== status.volatileState) {
        await this.battleRepository.updateBattlePokemonStatus(status.id, {
          volatileState: ticked,
        });
      }
    }
  }

  /**
   * 最新のバトルを読む
   */
  private async findBattle(battleId: number): Promise<Battle> {
    const battle = await this.battleRepository.findById(battleId);
    if (!battle) {
      throw new NotFoundException('Battle', battleId);
    }
    return battle;
  }

  /**
   * トレーナーの場にいる最新のポケモンを読む
   */
  private async findActivePokemon(
    battleId: number,
    trainerId: number,
  ): Promise<BattlePokemonStatus> {
    const active = await this.battleRepository.findActivePokemonByBattleIdAndTrainerId(
      battleId,
      trainerId,
    );
    if (!active) {
      throw new NotFoundException('Active pokemon');
    }
    return active;
  }
}
