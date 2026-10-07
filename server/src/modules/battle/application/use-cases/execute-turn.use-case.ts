import { Injectable, Inject } from '@nestjs/common';
import {
  IBattleRepository,
  BATTLE_REPOSITORY_TOKEN,
} from '../../domain/battle.repository.interface';
import { Battle, BattleStatus } from '../../domain/entities/battle.entity';
import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import {
  MutableStatePatch,
  isEmptyObject,
  markRemoved,
} from '../../domain/state/state-field-parser';
import {
  VolatileState,
  clearVolatileOnSwitchOut,
  releaseVolatileReferencesTo,
  tickVolatileStateAtTurnEnd,
} from '../../domain/state/volatile-state';
import {
  PendingChoice,
  getGlobalFieldState,
  getSideConditions,
  tickSideStateAtTurnEnd,
} from '../../domain/state/side-state';
// 場の状態・設置技・交代の仕組み（Issue #102 #103 #110 #135 一部）
import { findFaintedPartyMembers, findSwitchTargets } from '../../domain/logic/party';
import { StatusCondition } from '../../domain/entities/status-condition.enum';
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
    // 'move' | 'switch' | 'turnStart'（ターンの初めの効果。くちばしキャノンの加熱など）|
    // 'futureAttack'（みらいよち・はめつのねがいが当たった。trainerId は技を使ったポケモンのトレーナー）|
    // 'revive'（さいきのいのりで手持ちが復活した）|
    // 'ability'（ひんしを知った場の特性が発動した。ソウルハートなど。trainerId は特性を持つポケモンのトレーナー）。
    // 技・特性による交代（とんぼがえり・ほえる・ききかいひ）も 'switch'
    action: string;
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
 * 2. 行動の実行（技の実行またはポケモン交代）。ひんしのポケモンは行動しない
 * 3. ダメージ計算
 * 4. 特性効果の処理
 * 5. 勝敗判定（技を出すたびと、みらいよち・ターン終了時の処理のあと）
 */
@Injectable()
export class ExecuteTurnUseCase {
  /**
   * 交代の予約を続けて解決する回数の上限（設置技でききかいひが続けて発動したとき）
   */
  private static readonly MAX_PENDING_SWITCH_ROUNDS = 6;

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
        await this.planAction(battle, params.trainer1Action, trainer1Active, trainer2Active),
      ],
      [
        params.trainer2Action.trainerId,
        await this.planAction(battle, params.trainer2Action, trainer2Active, trainer1Active),
      ],
    ]);
    const planOf = (trainerId: number): PlannedAction | undefined => plans.get(trainerId);
    // 行動を決めたポケモン。とんぼがえり・ほえる・ききかいひなどで場から離れたら、そのターンの技は出さない
    const plannedActorIds = new Map<number, number>([
      [params.trainer1Action.trainerId, trainer1Active.id],
      [params.trainer2Action.trainerId, trainer2Active.id],
    ]);

    // 行動順を決定
    const actions = await this.actionOrderDeterminer.determine({
      battle,
      trainer1Action: planOf(params.trainer1Action.trainerId).action,
      trainer2Action: planOf(params.trainer2Action.trainerId).action,
      trainer1Active,
      trainer2Active,
    });

    const actionResults: Array<{ trainerId: number; action: string; result: string }> = [];
    // ひんしを場の特性に知らせたポケモン。ターンの初めにひんしのポケモンは、前のターンに知らせ済み
    const notifiedFaintIds = new Set(
      ((await this.battleRepository.findBattlePokemonStatusByBattleId(battle.id)) ?? [])
        .filter(status => status.isFainted())
        .map(status => status.id),
    );

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
      if (user.isFainted()) {
        continue;
      }
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
        // 先に行動した相手に倒されたポケモン（交代するまで場に残る）と、
        // 技・特性で交代して出てきたポケモンは行動しない
        if (attacker.isFainted() || attacker.id !== plannedActorIds.get(action.trainerId)) {
          continue;
        }

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

        // 技・反動・接触特性などでひんしになったことを知らせ、
        // そのポケモンによる、ほかのポケモンの状態（逃げられない・バインド・メロメロ）を消す
        await this.processFaints(battle.id, notifiedFaintIds, actionResults);

        // 勝敗判定
        const completed = await this.completeIfDecided(battle.id, actionResults);
        if (completed) {
          return completed;
        }

        // とんぼがえり・ほえる・ききかいひ・さいきのいのりなどの交代と復活
        const completedByPendingSwitch = await this.resolvePendingSwitches(
          battle.id,
          actionResults,
          notifiedFaintIds,
        );
        if (completedByPendingSwitch) {
          return completedByPendingSwitch;
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
        const entryMessages = await this.pokemonSwitcher.executeSwitch(
          currentBattle,
          action.trainerId,
          action.switchPokemonId,
        );
        actionResults.push({
          trainerId: action.trainerId,
          action: 'switch',
          result: [`Pokemon switched to ID: ${action.switchPokemonId}`, ...entryMessages].join(' '),
        });

        // 設置技でひんしになったことを知らせてそのポケモンによる状態を消し、最後のポケモンなら勝敗を決める
        await this.processFaints(battle.id, notifiedFaintIds, actionResults);
        const completedBySwitch = await this.completeIfDecided(battle.id, actionResults);
        if (completedBySwitch) {
          return completedBySwitch;
        }
        // 設置技で HP が半分以下になったききかいひ・にげごしの交代
        const completedByPendingSwitch = await this.resolvePendingSwitches(
          battle.id,
          actionResults,
          notifiedFaintIds,
        );
        if (completedByPendingSwitch) {
          return completedByPendingSwitch;
        }
      }
    }

    // みらいよち・はめつのねがいを当てる（残りターン数が 1 の陣営。このあとの tickSideStateAtTurnEnd で消える）
    const futureAttacks = await this.moveExecutor.executeFutureAttacks(
      await this.findBattle(battle.id),
    );
    for (const { trainerId, message } of futureAttacks) {
      actionResults.push({ trainerId, action: 'futureAttack', result: message });
    }
    await this.processFaints(battle.id, notifiedFaintIds, actionResults);
    const completedByFutureAttack = await this.completeIfDecided(battle.id, actionResults);
    if (completedByFutureAttack) {
      return completedByFutureAttack;
    }

    // ターン終了時の特性効果を処理（行動で変わった天候なども見えるよう、読み直したバトルを渡す）
    const battleAtTurnEnd = await this.findBattle(battle.id);
    const hpBeforeTurnEnd = new Map(
      (await this.battleRepository.findBattlePokemonStatusByBattleId(battle.id))
        .filter(status => status.isActive)
        .map(status => [status.id, status.currentHp] as const),
    );
    await this.statusConditionProcessor.processTurnEndAbilities(battleAtTurnEnd);
    await this.processFaints(battle.id, notifiedFaintIds, actionResults);
    // ほろびのうた・やどりぎのタネ・のろい・バインドなどで最後のポケモンが倒れたら、ここで勝敗が決まる
    const completedAtTurnEnd = await this.completeIfDecided(battle.id, actionResults);
    if (completedAtTurnEnd) {
      return completedAtTurnEnd;
    }
    // 状態の残りターン数を減らし、このターンだけの状態を消す。
    // 切れる直前の値（1）を読む効果は上のターン終了時の処理で済んでいるので、そのあとで行う
    await this.settleVolatileStatesAtTurnEnd(battle.id, notifiedFaintIds, actionResults);

    // ターン終了時の処理が書いた sideState も残すよう、読み直してから減らす（変わったときだけ書く）
    const battleAtTick = await this.findBattle(battle.id);
    const tickedSideState = tickSideStateAtTurnEnd(battleAtTick.sideState);
    if (tickedSideState !== battleAtTick.sideState) {
      await this.battleRepository.update(battle.id, { sideState: tickedSideState });
    }

    // ターン終了時のダメージで HP が半分以下になったききかいひ・にげごしの交代。
    // 残りターン数を減らしたあとに行うので、出てきたポケモンが出した天候・フィールドは
    // 次のターンの終わりから減る（本家も残りの処理のあとの交代は次のターンから数える）
    await this.pokemonSwitcher.scheduleEmergencyExits(battle.id, hpBeforeTurnEnd);
    const completedByTurnEndSwitch = await this.resolvePendingSwitches(
      battle.id,
      actionResults,
      notifiedFaintIds,
    );
    if (completedByTurnEndSwitch) {
      return completedByTurnEndSwitch;
    }

    // ターン数を増やす（交代で書かれた sideState を消さないよう、読み直してから書く）
    const battleBeforeNextTurn = await this.findBattle(battle.id);
    const updatedBattle = await this.battleRepository.update(battle.id, {
      turn: battleBeforeNextTurn.turn + 1,
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
   * 2. 交代: ねをはる・逃げられない状態・バインド状態・相手の特性（かげふみなど）・フェアリーロックなら
   *    交代できない（ゴーストタイプは交代できる）
   * 3. 技: アンコール中はアンコールされた技を出す（その技の PP が 0 ならアンコールが解ける）。
   *    技の欄は、ものまねなどで入れ替わった技（moveSlotOverrides）を先に見る。
   *    PP がない・技の制限で出せない技を選び、ほかに出せる技もないときは、わるあがきを出す
   */
  private async planAction(
    battle: Battle,
    action: TrainerAction,
    active: BattlePokemonStatus,
    opponent: BattlePokemonStatus,
  ): Promise<PlannedAction> {
    const gravity = getGlobalFieldState(battle.sideState).gravityTurns !== undefined;
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
      const blocker = await this.pokemonSwitcher.findSwitchBlocker(active, opponent, battle);
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
        (await this.planStruggle(action, active, opponent, slots, gravity)) ?? {
          action: chosen,
          failure: 'Move has no PP left',
        }
      );
    }
    if (
      this.hasSelectionRestriction(active, opponent, gravity) &&
      !(await this.moveExecutor.isMoveSelectable(active, opponent, moveId, { gravity }))
    ) {
      // 制限で出せない技でも、ほかに出せる技があれば選んだまま出す（技を出す前の判定で止まる）
      return (
        (await this.planStruggle(action, active, opponent, slots, gravity)) ?? {
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
    gravity: boolean,
  ): Promise<PlannedAction | undefined> {
    const restricted = this.hasSelectionRestriction(active, opponent, gravity);
    for (const slot of slots) {
      if (slot.currentPp <= 0) {
        continue;
      }
      if (
        !restricted ||
        (await this.moveExecutor.isMoveSelectable(active, opponent, slot.moveId, { gravity }))
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
   * 技の選択を制限する状態があるか（ちょうはつ・かなしばり・いちゃもん・かいふくふうじ・じごくづき・こだわり・相手のふういん・
   * じゅうりょく）。ないときは、技ごとの判定（技のリポジトリを引く）をしない
   */
  private hasSelectionRestriction(
    active: BattlePokemonStatus,
    opponent: BattlePokemonStatus,
    gravity: boolean,
  ): boolean {
    const state = active.volatileState;
    return (
      gravity ||
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
   * - ひんしのポケモンを指す、ほかのポケモンの状態を消す（processFaints）
   * - ひんしのポケモンは、すべてのキーを消す（ほろびのうたのカウントやみがわりを持ち越さない）
   * - それ以外は、残りターン数を 1 減らし、このターンだけのフラグを消す
   * 変える所がないポケモンには書き込まない
   */
  private async settleVolatileStatesAtTurnEnd(
    battleId: number,
    notifiedFaintIds: Set<number>,
    actionResults: ExecuteTurnResult['actions'],
  ): Promise<void> {
    await this.processFaints(battleId, notifiedFaintIds, actionResults);
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
   * 勝敗が決まっていれば、バトルを終わらせて結果を返す（決まっていなければ undefined）
   * 技を出したあとと、みらいよち・ターン終了時の処理のあとに呼ぶ（本家はひんしが出るたびに checkWin する）
   */
  private async completeIfDecided(
    battleId: number,
    actionResults: ExecuteTurnResult['actions'],
  ): Promise<ExecuteTurnResult | undefined> {
    const winner = await this.winnerChecker.checkWinner(battleId);
    if (!winner) {
      return undefined;
    }
    await this.battleRepository.update(battleId, {
      status: BattleStatus.Completed,
      winnerTrainerId: winner,
    });
    return {
      battle: (await this.battleRepository.findById(battleId)) as Battle,
      actions: actionResults,
      winnerTrainerId: winner,
    };
  }

  /**
   * ひんしになったときの処理（技・反動・状態異常・接触特性・設置技など、原因によらずここで行う）
   * 技・交代・みらいよち・ターン終了時の処理のあとに呼ぶ。何度呼んでも、同じひんしを 2 回知らせない
   *
   * 1. 新しくひんしになった場のポケモンごとに、場の特性の onAnyFaint を呼ぶ（ソウルハート。本家の onAnyFaint）。
   *    メッセージは 'ability' の結果に入れる。知らせたポケモンは notifiedFaintIds に入れ、
   *    ひんしでなくなった（さいきのいのりで復活した）ポケモンは取り除く
   * 2. ひんしのポケモンを指している、ほかのポケモンの状態を消す（releaseReferencesToFainted）
   * @param notifiedFaintIds ひんしを知らせたポケモン（BattlePokemonStatus の ID）。この関数が書き換える
   */
  private async processFaints(
    battleId: number,
    notifiedFaintIds: Set<number>,
    actionResults: ExecuteTurnResult['actions'],
  ): Promise<void> {
    const statuses =
      (await this.battleRepository.findBattlePokemonStatusByBattleId(battleId)) ?? [];
    for (const status of statuses) {
      if (!status.isFainted()) {
        notifiedFaintIds.delete(status.id);
        continue;
      }
      if (!status.isActive || notifiedFaintIds.has(status.id)) {
        continue;
      }
      notifiedFaintIds.add(status.id);
      for (const notice of await this.pokemonSwitcher.notifyFaint(battleId, status)) {
        actionResults.push({
          trainerId: notice.trainerId,
          action: 'ability',
          result: notice.message,
        });
      }
    }
    await this.releaseReferencesToFainted(battleId);
  }

  /**
   * 場でひんしになったポケモンを指している、ほかのポケモンの状態を消す
   * 逃げられない状態・たこがため・メロメロ・バインド状態（releaseVolatileReferencesTo）と、出したゲンシ天候。
   * ひんしのポケモンは交代で引っ込むまで場に残るので、交代の処理を待たずにここで消す（本家はひんしになったときに消す）
   */
  private async releaseReferencesToFainted(battleId: number): Promise<void> {
    const statuses =
      (await this.battleRepository.findBattlePokemonStatusByBattleId(battleId)) ?? [];
    const faintedIds = statuses.filter(s => s.isActive && s.isFainted()).map(s => s.id);
    // ひんしのポケモンが出したゲンシ天候を終わらせる（同じ特性のポケモンが場にいれば引き継ぐ）
    for (const faintedId of faintedIds) {
      await this.pokemonSwitcher.releasePrimalWeather(battleId, faintedId);
    }
    // 特性を書き換えられた・消された（スキルスワップ・いえき・かがくへんかガス）ポケモンのゲンシ天候も終わらせる
    await this.pokemonSwitcher.releasePrimalWeatherIfAbilityLost(battleId);
    for (const status of statuses) {
      let released = status.volatileState;
      for (const faintedId of faintedIds) {
        if (faintedId !== status.id) {
          released = releaseVolatileReferencesTo(released, faintedId);
        }
      }
      if (released === status.volatileState) {
        continue;
      }
      // 消えたキーだけを部分更新で消す
      const patch: MutableStatePatch<VolatileState> = {};
      for (const key of Object.keys(status.volatileState) as Array<keyof VolatileState>) {
        if (released[key] === undefined) {
          markRemoved(patch, key);
        }
      }
      await this.battleRepository.patchVolatileState(status.id, patch);
    }
  }

  /**
   * 技・特性が予約した交代と復活を行う（行動のすぐあとと、ターン終了時の処理のあとに呼ぶ）
   *
   * - forcedSwitch（ほえる・ふきとばし・ドラゴンテール・ともえなげ）: 場のポケモンを、控えからランダムに選んだ
   *   ポケモンと入れ替える
   * - pendingChoice の pivot・batonPass・shedTail・emergencyExit: 場のポケモンを、控えの先頭（ID の順）と交代させる。
   *   batonPass・shedTail は引き継ぐものも渡す
   * - pendingChoice の revivalBlessing: ひんしの手持ちの先頭を、最大 HP の半分（切り捨て、最低 1）で復活させる
   *   （状態異常も治す。場には出さない）。persistentState.revivalCount を 1 増やす
   * 場のポケモンがひんし・控えがいないときは、交代せずにキーだけを消す。出てきたポケモンが設置技で
   * ききかいひを発動したときのため、予約がなくなるまでくり返す
   * 注: 交代先・復活させるポケモンをプレイヤーが選ぶ API はまだないので、控えの先頭を選ぶ（docs/battle-state.md の 7 章）
   * @returns 設置技で最後のポケモンが倒れて勝敗が決まったときの結果
   */
  private async resolvePendingSwitches(
    battleId: number,
    actionResults: ExecuteTurnResult['actions'],
    notifiedFaintIds: Set<number>,
  ): Promise<ExecuteTurnResult | undefined> {
    for (let round = 0; round < ExecuteTurnUseCase.MAX_PENDING_SWITCH_ROUNDS; round++) {
      let resolved = false;
      const battle = await this.findBattle(battleId);
      for (const trainerId of [battle.trainer1Id, battle.trainer2Id]) {
        const side = getSideConditions(battle.sideState, trainerId);
        if (side.forcedSwitch === true) {
          await this.battleRepository.patchSideConditions(battleId, trainerId, {
            forcedSwitch: null,
          });
          resolved =
            (await this.switchActive(battleId, trainerId, 'random', actionResults)) || resolved;
        }
        if (side.pendingChoice) {
          await this.battleRepository.patchSideConditions(battleId, trainerId, {
            pendingChoice: null,
          });
          resolved =
            (await this.resolvePendingChoice(
              battleId,
              trainerId,
              side.pendingChoice,
              actionResults,
            )) || resolved;
        }
      }
      if (!resolved) {
        return undefined;
      }
      await this.processFaints(battleId, notifiedFaintIds, actionResults);
      const completed = await this.completeIfDecided(battleId, actionResults);
      if (completed) {
        return completed;
      }
    }
    return undefined;
  }

  /**
   * pendingChoice を解決する（交代させるか、ひんしの手持ちを復活させる）
   * @returns 何かしたら true
   */
  private async resolvePendingChoice(
    battleId: number,
    trainerId: number,
    choice: PendingChoice,
    actionResults: ExecuteTurnResult['actions'],
  ): Promise<boolean> {
    if (choice.reason !== 'revivalBlessing') {
      return this.switchActive(battleId, trainerId, 'first', actionResults, choice.reason);
    }
    const statuses = await this.battleRepository.findBattlePokemonStatusByBattleId(battleId);
    const [revived] = findFaintedPartyMembers(statuses, trainerId);
    if (!revived) {
      return false;
    }
    await this.battleRepository.updateBattlePokemonStatus(revived.id, {
      currentHp: Math.max(1, Math.floor(revived.maxHp / 2)),
      statusCondition: StatusCondition.None,
    });
    await this.battleRepository.patchPersistentState(revived.id, {
      revivalCount: (revived.persistentState.revivalCount ?? 0) + 1,
    });
    actionResults.push({
      trainerId,
      action: 'revive',
      result: `Pokemon (ID: ${revived.trainedPokemonId}) was revived and is ready to fight again!`,
    });
    return true;
  }

  /**
   * 場のポケモンを控えと交代させる（場のポケモンがひんし・控えがいなければ何もしない）
   * @param pick 控えの選び方（random: ランダム、first: ID の順で先頭）
   * @returns 交代したら true
   */
  private async switchActive(
    battleId: number,
    trainerId: number,
    pick: 'random' | 'first',
    actionResults: ExecuteTurnResult['actions'],
    reason?: PendingChoice['reason'],
  ): Promise<boolean> {
    const active = await this.battleRepository.findActivePokemonByBattleIdAndTrainerId(
      battleId,
      trainerId,
    );
    const statuses = await this.battleRepository.findBattlePokemonStatusByBattleId(battleId);
    const targets = findSwitchTargets(statuses, trainerId);
    if (!active || active.isFainted() || targets.length === 0) {
      return false;
    }
    const target =
      pick === 'random' ? targets[Math.floor(Math.random() * targets.length)] : targets[0];
    const entryMessages = await this.pokemonSwitcher.executeSwitch(
      await this.findBattle(battleId),
      trainerId,
      target.trainedPokemonId,
      reason === 'batonPass' || reason === 'shedTail' ? { transfer: reason } : {},
    );
    actionResults.push({
      trainerId,
      action: 'switch',
      result: [
        ...(pick === 'random' ? ['Pokemon was dragged out!'] : []),
        `Pokemon switched to ID: ${target.trainedPokemonId}`,
        ...entryMessages,
      ].join(' '),
    });
    return true;
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
