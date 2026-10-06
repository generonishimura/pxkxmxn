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
import {
  MoveSlot,
  STRUGGLE_MOVE_NAME,
  findMoveSlot,
  resolveForcedAction,
  resolveMoveSlots,
} from '../../domain/logic/move-selection';
import { switchBlockedMessage } from '../../domain/logic/switch-restriction';
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
    action: string; // 'move' | 'switch' | 'turnStart'（ターンの初めの効果。くちばしキャノンの加熱など）
    result: string; // 行動結果の説明
  }>;
  winnerTrainerId?: number; // 勝者が決まった場合
}

type TrainerAction = ExecuteTurnParams['trainer1Action'];

/**
 * 一時的な状態を反映した行動の計画
 */
interface PlannedAction {
  /** 行動順の決定に渡す行動（反動・ため技・出し続ける技・アンコール・わるあがきで、選んだ技から変わる） */
  readonly action: TrainerAction;
  /** PP を減らす技の欄（BattlePokemonMove の ID）。覚えていない技を出し続けるときは undefined */
  readonly battlePokemonMoveId?: number;
  /** 行動できないときの結果（技が見つからない・PP がない・交代できない）。行動の順番が来たら結果に入れる */
  readonly failure?: string;
  /** 反動で動けないターン（ターンの初めの効果を呼ばない） */
  readonly recharging?: boolean;
}

/**
 * ExecuteTurnUseCase
 * ターン処理のロジックを実行するユースケース
 *
 * 処理内容:
 * 0. 一時的な状態から行動を決める（planAction: 反動・ため技・出し続ける技・アンコール・ものまねの技・
 *    わるあがき・交代の制限）
 * 1. 行動順の決定（速度と優先度を考慮）。そのあとターンの初めの効果（技の onTurnStart）
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

    // 一時的な状態から行動を決める
    const plans = new Map<number, PlannedAction>([
      [
        params.trainer1Action.trainerId,
        await this.planAction(params.trainer1Action, trainer1Active, trainer2Active),
      ],
      [
        params.trainer2Action.trainerId,
        await this.planAction(params.trainer2Action, trainer2Active, trainer1Active),
      ],
    ]);
    const planOf = (trainerId: number): PlannedAction | undefined => plans.get(trainerId);

    // 行動順を決定
    const actions = await this.actionOrderDeterminer.determine({
      battle,
      trainer1Action: planOf(params.trainer1Action.trainerId).action,
      trainer2Action: planOf(params.trainer2Action.trainerId).action,
      trainer1Active,
      trainer2Active,
    });

    const actionResults: Array<{ trainerId: number; action: string; result: string }> = [];

    // ターンの初めの効果（くちばしキャノンの加熱など）を行動順に呼ぶ
    for (const action of actions) {
      const plan = planOf(action.trainerId);
      if (action.action !== 'move' || !action.moveId || plan?.failure || plan?.recharging) {
        continue;
      }
      const [user, opponent] =
        action.trainerId === trainer1Active.trainerId
          ? [trainer1Active, trainer2Active]
          : [trainer2Active, trainer1Active];
      const message = await this.moveExecutor.runTurnStartHook(
        battle,
        action.moveId,
        user,
        opponent,
      );
      if (message) {
        actionResults.push({ trainerId: action.trainerId, action: 'turnStart', result: message });
      }
    }

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

        // 技が見つからない・PP がないときは、計画のときに決めた結果を入れる
        const plan = planOf(action.trainerId);
        if (plan?.failure) {
          actionResults.push({ trainerId: action.trainerId, action: 'move', result: plan.failure });
          continue;
        }
        // 相手がこのあとに技を出すなら、その技（さきどり・ふいうち）
        const defenderPendingMoveId = actions
          .slice(actionIndex + 1)
          .find(
            next =>
              next.action === 'move' &&
              next.trainerId !== action.trainerId &&
              !planOf(next.trainerId)?.failure,
          )?.moveId;

        // ねむり・こおり・まひ・ひるみ・こんらんなど、技を出せるかの判定は MoveExecutorService が行う
        const result = await this.moveExecutor.executeMove(
          currentBattle,
          action.trainerId,
          action.moveId,
          attacker,
          defender,
          plan?.battlePokemonMoveId,
          { isLastToMove, defenderPendingMoveId },
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
        const plan = planOf(action.trainerId);
        if (plan?.failure) {
          actionResults.push({
            trainerId: action.trainerId,
            action: 'switch',
            result: plan.failure,
          });
          continue;
        }
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

    // みらいよち・はめつのねがいを当てる（残りターン数が 1 の陣営。このあとの tickSideStateAtTurnEnd で消える）
    await this.moveExecutor.executeFutureAttacks(await this.findBattle(battle.id));

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
   * 一時的な状態から、このターンの行動を決める
   *
   * 1. 反動・ため技の 2 ターン目・出し続ける技（resolveForcedAction）: 選んだ行動にかかわらず、その技を出す（交代もできない）
   * 2. 交代: ねをはる・逃げられない状態・バインド状態なら交代できない（ゴーストタイプは、ねをはる以外では交代できる）
   * 3. 技: アンコール中はアンコールされた技を出す（その技の PP が 0 ならアンコールが解ける）。
   *    技の欄は、ものまねなどで入れ替わった技（moveSlotOverrides）を先に見る。
   *    PP がない・技の制限で出せない技を選び、ほかに出せる技もないときは、わるあがきを出す
   */
  private async planAction(
    action: TrainerAction,
    active: BattlePokemonStatus,
    opponent: BattlePokemonStatus,
  ): Promise<PlannedAction> {
    const forced = resolveForcedAction(active.volatileState);
    if (forced && forced.kind !== 'encore') {
      const forcedMoveId = forced.moveId ?? action.moveId;
      if (forcedMoveId === undefined) {
        return { action };
      }
      const forcedSlots = await this.findMoveSlots(active);
      return {
        action: { trainerId: action.trainerId, moveId: forcedMoveId },
        battlePokemonMoveId: findMoveSlot(forcedSlots, forcedMoveId)?.battlePokemonMoveId,
        recharging: forced.kind === 'recharge',
      };
    }

    if (action.switchPokemonId) {
      const blocker = await this.pokemonSwitcher.findSwitchBlocker(active);
      return blocker ? { action, failure: switchBlockedMessage(blocker) } : { action };
    }
    if (!action.moveId) {
      return { action };
    }

    const slots = await this.findMoveSlots(active);
    let moveId = action.moveId;
    if (forced?.kind === 'encore') {
      const encoreSlot = findMoveSlot(slots, forced.moveId);
      if (encoreSlot && encoreSlot.currentPp > 0) {
        moveId = forced.moveId;
      } else {
        // アンコールされた技の PP がなくなったら、アンコールは解ける
        await this.battleRepository.patchVolatileState(active.id, { encore: null });
      }
    }

    const slot = findMoveSlot(slots, moveId);
    const chosen: TrainerAction = { trainerId: action.trainerId, moveId };
    if (!slot) {
      return {
        action: chosen,
        failure: `Move not found in battle pokemon moves (moveId: ${moveId}, battlePokemonStatusId: ${active.id})`,
      };
    }
    if (slot.currentPp <= 0) {
      return (
        (await this.planStruggle(action, active, opponent, slots)) ?? {
          action: chosen,
          failure: 'Move has no PP left',
        }
      );
    }
    if (
      this.hasSelectionRestriction(active, opponent) &&
      !(await this.moveExecutor.isMoveSelectable(active, opponent, moveId))
    ) {
      // 制限で出せない技でも、ほかに出せる技があれば選んだまま出す（技を出す前の判定で止まる）
      return (
        (await this.planStruggle(action, active, opponent, slots)) ?? {
          action: chosen,
          battlePokemonMoveId: slot.battlePokemonMoveId,
        }
      );
    }
    return { action: chosen, battlePokemonMoveId: slot.battlePokemonMoveId };
  }

  /**
   * 出せる技（PP があり、技の制限を受けない技）が 1 つもなければ、わるあがきを出す計画を返す
   * 出せる技があるとき・わるあがきが見つからないときは undefined
   */
  private async planStruggle(
    action: TrainerAction,
    active: BattlePokemonStatus,
    opponent: BattlePokemonStatus,
    slots: readonly MoveSlot[],
  ): Promise<PlannedAction | undefined> {
    const restricted = this.hasSelectionRestriction(active, opponent);
    for (const slot of slots) {
      if (slot.currentPp <= 0) {
        continue;
      }
      if (
        !restricted ||
        (await this.moveExecutor.isMoveSelectable(active, opponent, slot.moveId))
      ) {
        return undefined;
      }
    }
    const struggleMoveId = await this.moveExecutor.findMoveIdByName(STRUGGLE_MOVE_NAME);
    return struggleMoveId === undefined
      ? undefined
      : { action: { trainerId: action.trainerId, moveId: struggleMoveId } };
  }

  /**
   * 技の選択を制限する状態があるか（ちょうはつ・かなしばり・いちゃもん・かいふくふうじ・じごくづき・こだわり・相手のふういん）
   * ないときは、技ごとの判定（技のリポジトリを引く）をしない
   */
  private hasSelectionRestriction(
    active: BattlePokemonStatus,
    opponent: BattlePokemonStatus,
  ): boolean {
    const state = active.volatileState;
    return (
      state.tauntTurns !== undefined ||
      state.disable !== undefined ||
      state.torment === true ||
      state.healBlockTurns !== undefined ||
      state.throatChopTurns !== undefined ||
      state.choiceLockedMoveId !== undefined ||
      opponent.volatileState.imprison === true
    );
  }

  /**
   * ポケモンの技の欄（ものまねなどで入れ替わった技を反映したもの）
   */
  private async findMoveSlots(pokemon: BattlePokemonStatus): Promise<MoveSlot[]> {
    const moves =
      (await this.battleRepository.findBattlePokemonMovesByBattlePokemonStatusId(pokemon.id)) ?? [];
    return resolveMoveSlots(moves, pokemon.volatileState);
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
