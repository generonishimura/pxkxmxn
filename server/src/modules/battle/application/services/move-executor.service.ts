import { Injectable, Inject } from '@nestjs/common';
import { Battle } from '../../domain/entities/battle.entity';
import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import {
  IBattleRepository,
  BATTLE_REPOSITORY_TOKEN,
} from '../../domain/battle.repository.interface';
import {
  ITrainedPokemonRepository,
  TRAINED_POKEMON_REPOSITORY_TOKEN,
} from '@/modules/trainer/domain/trainer.repository.interface';
import {
  IMoveRepository,
  ITypeEffectivenessRepository,
  MOVE_REPOSITORY_TOKEN,
  TYPE_EFFECTIVENESS_REPOSITORY_TOKEN,
} from '@/modules/pokemon/domain/pokemon.repository.interface';
import { TrainedPokemon } from '@/modules/trainer/domain/entities/trained-pokemon.entity';
import {
  DamageCalculationParams,
  DamageCalculator,
  MoveInfo,
} from '../../domain/logic/damage-calculator';
import { AccuracyCalculator } from '../../domain/logic/accuracy-calculator';
import { StatCalculator } from '../../domain/logic/stat-calculator';
import { Type } from '@/modules/pokemon/domain/entities/type.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { MoveRegistry } from '@/modules/pokemon/domain/moves/move-registry';
import { NotFoundException } from '@/shared/domain/exceptions';
import { Move } from '@/modules/pokemon/domain/entities/move.entity';
import { IMoveEffect } from '@/modules/pokemon/domain/moves/move-effect.interface';
import { IAbilityEffect } from '@/modules/pokemon/domain/abilities/ability-effect.interface';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { MoveFlags, isContactMove } from '@/modules/pokemon/domain/moves/move-flags';
import { HitResult } from '@/modules/pokemon/domain/battle-events/hit-result';
import { StatType } from '@/modules/pokemon/domain/moves/effects/base/base-stat-change-effect';
import { resolveEffectiveWeather } from '../../domain/logic/effective-weather';
import { modifyByFixedPoint } from '../../domain/logic/fixed-point-modifier';
import { isMajorStatus } from '../../domain/logic/major-status';
import { applyStatOverrides } from '../../domain/logic/volatile-modifiers';
import { StatusCondition } from '../../domain/entities/status-condition.enum';
import { MoveBehaviors } from '@/modules/pokemon/domain/moves/move-behaviors';
import { CalledMoveRequest } from '@/modules/pokemon/domain/battle-events/called-move';
import { tryInflictStatus } from '@/modules/pokemon/domain/battle-events/status-infliction';
import { applyIndirectDamage } from '@/modules/pokemon/domain/battle-events/indirect-damage';
import { getSideConditions } from '../../domain/state/side-state';
import {
  STRUGGLE_MOVE_NAME,
  findMoveRestriction,
  findMoveSlot,
  resolveMoveSlots,
} from '../../domain/logic/move-selection';
import { BeforeMoveChecker } from './before-move-checker';
import { MoveLifecycle, MoveOutcome } from './move-lifecycle';

/**
 * 技の実行オプション
 */
export interface ExecuteMoveOptions {
  /**
   * このターン、技の使用者が最後に行動するかどうか（アナライズ）
   */
  isLastToMove?: boolean;
  /**
   * 相手がこのターンにまだ技を出していなければ、相手が出す予定の技の ID（さきどり・ふいうち）
   */
  defenderPendingMoveId?: number;
}

/**
 * 別の技から呼ばれた技の情報
 */
interface CalledMoveInfo {
  /** 呼び出した技・特性の名前 */
  readonly calledBy: string;
  /** 威力の倍率（さきどり = 1.5） */
  readonly powerMultiplier?: number;
  /** 呼び出しの深さ（1 から） */
  readonly depth: number;
  /** みらいよち・はめつのねがいが当たるとき（技を置かずに、そのまま当てる） */
  readonly isFutureAttack?: boolean;
}

/**
 * 技を使う処理に渡すもの
 */
interface MoveUseParams {
  readonly battle: Battle;
  readonly move: Move;
  readonly attacker: BattlePokemonStatus;
  readonly defender: BattlePokemonStatus;
  readonly battlePokemonMoveId: number | undefined;
  readonly options: ExecuteMoveOptions;
  readonly attackerTrainedPokemon: TrainedPokemon;
  readonly defenderTrainedPokemon: TrainedPokemon;
  readonly called?: CalledMoveInfo;
}

/**
 * 技を使った結果（メッセージと、片付けに使う結果の種類）
 */
interface MoveUseResult {
  readonly message: string;
  readonly outcome: MoveOutcome;
  /** 出した技のタイプ（ダメージ技はタイプ変更の反映後。じゅうでんの消去に使う） */
  readonly moveTypeName?: string;
}

/**
 * MoveExecutorService
 * 技の実行を処理するサービス
 */
@Injectable()
export class MoveExecutorService {
  /**
   * 混乱の自傷とタイプなしの技（わるあがき）に使用する「実在しないタイプID」。
   *
   * この値は混乱時の自傷・タイプなしの技のダメージ計算で使用され、タイプ相性を1.0倍（無効化なし）として扱うために使用される。
   *
   * 前提条件:
   * - Prismaスキーマでは、TypeのIDは`@id @default(autoincrement())`で定義されており、
   *   PostgreSQLのSERIAL型（自動インクリメント）を使用している。
   * - これにより、データベースに保存されるTypeのIDは常に正の値（1以上）となる。
   *
   * この前提が破られた場合の影響:
   * - もし将来的にTypeのIDとして負の値や0が使用されるようになった場合、
   *   この定数と衝突する可能性がある。
   * - その場合は、この定数の値を変更するか、別の方法（例: 特別な定数値の使用）を検討する必要がある。
   */
  private static readonly CONFUSION_NON_EXISTENT_TYPE_ID = -1;

  /**
   * 別の技から呼ぶ深さの上限（ゆびをふる → ねごと → … が続かないように）
   */
  private static readonly MAX_CALLED_MOVE_DEPTH = 3;

  /**
   * ふんじんで爆発するときのダメージ（最大 HP の 1/4。四捨五入、最低 1）
   */
  private static readonly POWDER_DAMAGE_DIVISOR = 4;

  private readonly beforeMoveChecker: BeforeMoveChecker;
  private readonly moveLifecycle: MoveLifecycle;

  constructor(
    @Inject(BATTLE_REPOSITORY_TOKEN)
    private readonly battleRepository: IBattleRepository,
    @Inject(TRAINED_POKEMON_REPOSITORY_TOKEN)
    private readonly trainedPokemonRepository: ITrainedPokemonRepository,
    @Inject(MOVE_REPOSITORY_TOKEN)
    private readonly moveRepository: IMoveRepository,
    @Inject(TYPE_EFFECTIVENESS_REPOSITORY_TOKEN)
    private readonly typeEffectivenessRepository: ITypeEffectivenessRepository,
  ) {
    this.beforeMoveChecker = new BeforeMoveChecker(battleRepository);
    this.moveLifecycle = new MoveLifecycle(battleRepository);
  }

  /**
   * 技を実行
   *
   * 0. このターンに先にアンコールされていたら、アンコールされた技に変える（resolveEncoreOverride）
   * 1. 技を出す前の判定（BeforeMoveChecker: 反動・ねむり・こおり・なまけ・ひるみ・技の制限・こんらん・メロメロ・まひ）
   * 2. 技を使う（useMove）
   *    - PP を減らす（ため技の 2 ターン目・出し続ける技の 2 ターン目以降は減らさない）
   *    - 技を出した記録（lastMoveId など）
   *    - よこどり・ため技の 1 ターン目
   *    - 技の本体（runMoveBody）
   *    - 反動・出し続ける技・続けて出した回数
   * 3. 相手の特性の onOpponentMoveUsed（おどりこ）
   *
   * 技の本体（ダメージ技）の流れ:
   * 1. ヒットのコンテキストを作る（技名・技フラグ・効果のある天候・実数値・ランク無視・優先度）
   * 2. 両者の特性の preventsMove（しめりけなど）で技が失敗するかを判定する
   * 3. 防御側特性の isImmuneToMove（ぼうおんなど）で技そのものが無効かを判定する（無効なら onMoveBlocked）
   * 4. 技の shouldFail（ゆめくいなど）で技が失敗するかを判定する
   * 5. そらをとぶなどで隠れている相手に当たるかの判定と、命中判定
   * 6. 技タイプの決定（技の modifyMoveType → 攻撃側特性の modifyMoveType）と、技全体のタイプ相性
   * 7. 技の beforeDamage（連続技の回数決定）。このあと両者の状態を取り直す
   * 8. 技の威力の決定（技の modifyMovePower）
   * 9. ヒットごとにダメージを適用し（みがわりがあればみがわりに）、防御側特性の onDamagingHit → 攻撃側特性の onSourceDamagingHit を呼ぶ
   * 10. 接触時の特性 → onHit → afterDamage（合計ダメージ） → 防御側特性の onAfterMoveHit → 攻撃側特性の onKnockOut
   * 11. 倒した相手のみちづれ・おんねん
   *
   * @param battlePokemonMoveId 技の欄（BattlePokemonMove の ID）。覚えていない技を出し続けるとき（ゆびをふるで出た
   *   あばれるの 2 ターン目など）は undefined（PP を減らさない）
   */
  async executeMove(
    battle: Battle,
    attackerTrainerId: number,
    moveId: number,
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battlePokemonMoveId: number | undefined,
    options: ExecuteMoveOptions = {},
  ): Promise<string> {
    // 技情報を取得
    let move = await this.moveRepository.findById(moveId);

    if (!move) {
      throw new NotFoundException('Move', moveId);
    }

    // 先に行動した側が書いた状態（こおりが溶けた・ちょうはつなど）を見るため、最新の状態を読み直す
    attacker = (await this.battleRepository.findBattlePokemonStatusById(attacker.id)) ?? attacker;
    defender = (await this.battleRepository.findBattlePokemonStatusById(defender.id)) ?? defender;

    // このターンに先にアンコールされたら、アンコールされた技に変える（本家の onOverrideAction）
    const encored = await this.resolveEncoreOverride(attacker, move);
    if (encored) {
      move = encored.move;
      battlePokemonMoveId = encored.battlePokemonMoveId;
    }

    // 攻撃側と防御側のポケモン情報を取得
    const attackerTrainedPokemon = await this.trainedPokemonRepository.findById(
      attacker.trainedPokemonId,
    );
    const defenderTrainedPokemon = await this.trainedPokemonRepository.findById(
      defender.trainedPokemonId,
    );

    if (!attackerTrainedPokemon || !defenderTrainedPokemon) {
      const missingId = !attackerTrainedPokemon
        ? attacker.trainedPokemonId
        : defender.trainedPokemonId;
      throw new NotFoundException('TrainedPokemon', missingId);
    }

    // 技を出す前の判定（本家の onBeforeMove の順）
    const attackerAbilityEffect = attackerTrainedPokemon.ability
      ? AbilityRegistry.get(attackerTrainedPokemon.ability.name)
      : undefined;
    const beforeMove = await this.beforeMoveChecker.check({
      battle,
      move,
      attacker,
      defender,
      attackerAbilityEffect,
      battleContext: this.createHitContext({
        battle,
        move,
        moveEffect: MoveRegistry.get(move.name),
        attacker,
        defender,
        attackerTrainedPokemon,
        defenderTrainedPokemon,
        attackerAbilityEffect,
        defenderAbilityEffect: undefined,
        options,
      }),
      calculateConfusionSelfDamage: current =>
        this.calculateConfusionSelfDamage(battle, current, attackerTrainedPokemon),
    });
    if (beforeMove.cancelled === true) {
      return beforeMove.message;
    }

    const result = await this.useMove({
      battle,
      move,
      attacker: beforeMove.attacker,
      defender,
      battlePokemonMoveId,
      options,
      attackerTrainedPokemon,
      defenderTrainedPokemon,
    });
    const observerMessages = await this.runOpponentMoveObservers({
      battle,
      move,
      userId: attacker.id,
      observerId: defender.id,
      observerTrainedPokemon: defenderTrainedPokemon,
      options,
    });
    const observerMessage = observerMessages.map(message => ` ${message}`).join('');
    return `${beforeMove.prefix}${result.message}${observerMessage}`;
  }

  /**
   * アンコールされているのに別の技を出そうとしたとき、代わりに出すアンコールされた技と技の欄
   * 行動を決めたあと（このターン）にアンコールされたときに当たる。本家の encore の onOverrideAction と同じく、
   * アンコールされた技の PP を使う（このあとの PP を減らす処理がその欄を減らす）
   * - ため技の 2 ターン目・出し続ける技・反動のターン・わるあがきは変えない
   * - アンコールされた技の PP が 0 なら、アンコールを消して選んだ技を出す
   * @returns 変えないときは undefined
   */
  private async resolveEncoreOverride(
    attacker: BattlePokemonStatus,
    move: Move,
  ): Promise<{ move: Move; battlePokemonMoveId: number } | undefined> {
    const state = attacker.volatileState;
    const encore = state.encore;
    if (
      encore === undefined ||
      encore.moveId === move.id ||
      move.name === STRUGGLE_MOVE_NAME ||
      state.mustRecharge === true ||
      state.chargingMoveId !== undefined ||
      state.lockedInMove !== undefined
    ) {
      return undefined;
    }
    const moves =
      (await this.battleRepository.findBattlePokemonMovesByBattlePokemonStatusId(attacker.id)) ??
      [];
    const slot = findMoveSlot(resolveMoveSlots(moves, state), encore.moveId);
    if (!slot) {
      return undefined;
    }
    if (slot.currentPp <= 0) {
      await this.battleRepository.patchVolatileState(attacker.id, { encore: null });
      return undefined;
    }
    const encoredMove = await this.moveRepository.findById(encore.moveId);
    return encoredMove
      ? { move: encoredMove, battlePokemonMoveId: slot.battlePokemonMoveId }
      : undefined;
  }

  /**
   * ターンの初めに、技の onTurnStart を呼ぶ（くちばしキャノンの加熱など）
   * ExecuteTurnUseCase が、技を選んだポケモンごとに行動順で呼ぶ
   * @returns メッセージ（なければ null）
   */
  async runTurnStartHook(
    battle: Battle,
    moveId: number,
    user: BattlePokemonStatus,
    opponent: BattlePokemonStatus,
  ): Promise<string | null> {
    const move = await this.moveRepository.findById(moveId);
    const moveEffect = move ? MoveRegistry.get(move.name) : undefined;
    if (!move || !moveEffect?.onTurnStart) {
      return null;
    }
    const userTrainedPokemon = await this.trainedPokemonRepository.findById(user.trainedPokemonId);
    const opponentTrainedPokemon = await this.trainedPokemonRepository.findById(
      opponent.trainedPokemonId,
    );
    if (!userTrainedPokemon || !opponentTrainedPokemon) {
      return null;
    }
    const context = this.createHitContext({
      battle,
      move,
      moveEffect,
      attacker: user,
      defender: opponent,
      attackerTrainedPokemon: userTrainedPokemon,
      defenderTrainedPokemon: opponentTrainedPokemon,
      attackerAbilityEffect: undefined,
      defenderAbilityEffect: undefined,
      options: {},
    });
    return moveEffect.onTurnStart(user, opponent, context);
  }

  /**
   * ターン終了時に、みらいよち・はめつのねがいを当てる
   * SideConditions.futureAttack の turns が 1 の陣営の、場のポケモンに当てる（tickSideStateAtTurnEnd の前に呼ぶ）
   * 技を使ったポケモンが場を離れていても、そのポケモンの能力で当たる。PP は減らさず、技を出す前の判定もしない
   * 注: 本家は技を使ったポケモンが場にいないとき、特性・持ち物の補正を受けない。ここでは特性の補正も受ける
   * @returns 当てた技のメッセージ
   */
  async executeFutureAttacks(battle: Battle): Promise<string[]> {
    const latestBattle = (await this.battleRepository.findById(battle.id)) ?? battle;
    const messages: string[] = [];
    for (const trainerId of [latestBattle.trainer1Id, latestBattle.trainer2Id]) {
      const pending = getSideConditions(latestBattle.sideState, trainerId).futureAttack;
      if (pending?.turns !== 1) {
        continue;
      }
      const target = await this.battleRepository.findActivePokemonByBattleIdAndTrainerId(
        battle.id,
        trainerId,
      );
      const source = await this.battleRepository.findBattlePokemonStatusById(
        pending.sourceStatusId,
      );
      const move = await this.moveRepository.findById(pending.moveId);
      if (!target || target.isFainted() || !source || !move) {
        continue;
      }
      const sourceTrainedPokemon = await this.trainedPokemonRepository.findById(
        source.trainedPokemonId,
      );
      const targetTrainedPokemon = await this.trainedPokemonRepository.findById(
        target.trainedPokemonId,
      );
      if (!sourceTrainedPokemon || !targetTrainedPokemon) {
        continue;
      }
      const result = await this.useMove({
        battle: latestBattle,
        move,
        attacker: source,
        defender: target,
        battlePokemonMoveId: undefined,
        options: {},
        attackerTrainedPokemon: sourceTrainedPokemon,
        defenderTrainedPokemon: targetTrainedPokemon,
        called: { calledBy: move.name, depth: 1, isFutureAttack: true },
      });
      messages.push(result.message);
    }
    return messages;
  }

  /**
   * 技を選べるか（技の制限を受けないか）を判定する（ExecuteTurnUseCase が、わるあがきを出すかの判定に使う）
   * かなしばり・かいふくふうじ・じごくづき・ちょうはつ・相手のふういん・アンコール・いちゃもん・こだわりを見る
   * 技が見つからないときは選べるとみなす
   */
  async isMoveSelectable(
    user: BattlePokemonStatus,
    opponent: BattlePokemonStatus,
    moveId: number,
  ): Promise<boolean> {
    const move = await this.moveRepository.findById(moveId);
    if (!move) {
      return true;
    }
    const restriction = findMoveRestriction(
      user.volatileState,
      { moveId: move.id, moveName: move.name, category: move.category },
      { imprisonedMoveIds: await this.beforeMoveChecker.findImprisonedMoveIds(opponent) },
    );
    return restriction === undefined;
  }

  /**
   * 技名から技の ID を引く（わるあがきを出すときなど）
   * 技のリポジトリが findByName を持たないときは undefined
   */
  async findMoveIdByName(moveName: string): Promise<number | undefined> {
    const move = await this.moveRepository.findByName?.(moveName);
    return move?.id;
  }

  /**
   * 技を出す前の判定を通ったあとに、技を使う
   * called は、別の技（ゆびをふるなど）から呼ばれた技のときだけ渡す（PP を減らさず、使用者の記録を書かない）
   */
  private async useMove(params: MoveUseParams): Promise<MoveUseResult> {
    const { battle, move, defender, options, called } = params;
    const { attackerTrainedPokemon, defenderTrainedPokemon } = params;
    let attacker = params.attacker;
    const isCalled = called !== undefined;
    const previousState = attacker.volatileState;
    // ため技の 2 ターン目・出し続ける技の 2 ターン目以降は、PP を減らさない（本家と同じ）
    const isContinuation =
      !isCalled &&
      (previousState.chargingMoveId === move.id || previousState.lockedInMove?.moveId === move.id);

    const moveEffect = MoveRegistry.get(move.name);
    const attackerAbilityName = attackerTrainedPokemon.ability?.name;
    const defenderAbilityName = defenderTrainedPokemon.ability?.name;
    const attackerAbilityEffect = attackerAbilityName
      ? AbilityRegistry.get(attackerAbilityName)
      : undefined;
    // ヒットの前後で呼ぶ防御側特性は、かたやぶりでも無視しない（じきゅうりょく・さめはだ・プレッシャーなど）
    const defenderEventEffect = defenderAbilityName
      ? AbilityRegistry.get(defenderAbilityName)
      : undefined;

    const contextFor = (current: BattlePokemonStatus): BattleContext =>
      this.createHitContext({
        battle,
        move,
        moveEffect,
        attacker: current,
        defender,
        attackerTrainedPokemon,
        defenderTrainedPokemon,
        attackerAbilityEffect,
        defenderAbilityEffect: undefined,
        options,
        called,
      });

    // PP を減らす（プレッシャーの分を含む）
    if (!isCalled && !isContinuation && params.battlePokemonMoveId !== undefined) {
      await this.moveLifecycle.consumePp({
        attacker,
        defender,
        move,
        battlePokemonMoveId: params.battlePokemonMoveId,
        defenderEventEffect,
        battleContext: contextFor(attacker),
      });
    }

    // 技を出した記録（みちづれ・おんねんの消去、lastMoveId、こだわり、まもるの回数、バトル全体の lastMoveId）
    // みらいよちが当たるときは、技を出したことにならないので書かない
    if (called?.isFutureAttack !== true) {
      attacker = await this.moveLifecycle.recordMoveUse({
        battle,
        attacker,
        move,
        moveEffect,
        attackerAbilityEffect,
        isCalled,
      });
    }

    // ふんじん: ほのお技を出そうとすると爆発し、技は失敗する（PP は減る。マジックガードならダメージなし）
    if (attacker.volatileState.powder === true && move.type.name === 'ほのお') {
      const powderDamage = await applyIndirectDamage(
        attacker,
        Math.max(1, Math.round(attacker.maxHp / MoveExecutorService.POWDER_DAMAGE_DIVISOR)),
        contextFor(attacker),
      );
      return {
        message: `Used ${move.name} but the powder exploded! (${powderDamage} damage)`,
        outcome: 'failed',
        moveTypeName: move.type.name,
      };
    }

    // みらいよち・はめつのねがい: 相手の陣営に置き、2 ターン後のターン終了時に当たる
    if (MoveBehaviors.has(move.name, 'futureMove') && called?.isFutureAttack !== true) {
      const scheduled = await this.moveLifecycle.scheduleFutureAttack({
        battle,
        attacker,
        defender,
        move,
      });
      return scheduled
        ? { message: `Used ${move.name} and foresaw an attack!`, outcome: 'hit' }
        : { message: `Used ${move.name} but it failed`, outcome: 'failed' };
    }

    // よこどり: 相手がよこどりを使っていれば、奪われる変化技は相手が出す
    if (
      !isCalled &&
      defender.volatileState.snatch === true &&
      MoveBehaviors.has(move.name, 'snatch')
    ) {
      await this.battleRepository.patchVolatileState(defender.id, { snatch: null });
      const snatchedMessage = await this.executeCalledMove(battle, defender, attacker, {
        moveId: move.id,
        calledBy: 'よこどり',
      });
      return {
        message: `Used ${move.name} but it was snatched! ${snatchedMessage}`,
        outcome: 'failed',
      };
    }

    // ため技の 1 ターン目（ためたら、ここで終わる）
    const charge = await this.moveLifecycle.handleChargeTurn({
      attacker,
      defender,
      move,
      moveEffect,
      battleContext: contextFor(attacker),
    });
    if (charge.charged === true) {
      return { message: charge.message, outcome: 'charged' };
    }
    attacker = charge.attacker;

    const body = await this.runMoveBody({ ...params, attacker });
    const afterMessage = await this.moveLifecycle.afterMove({
      attacker,
      move,
      moveEffect,
      outcome: body.outcome,
      isCalled,
      previousState,
      moveTypeName: body.moveTypeName ?? move.type.name,
      battleContext: contextFor(attacker),
    });
    return afterMessage ? { ...body, message: `${body.message} ${afterMessage}` } : body;
  }

  /**
   * 別の技を、技の処理の流れに乗せて出す（battleContext.callMove の中身）
   * PP を減らさず、技を出す前の判定もしない。呼び出しが深くなりすぎたら失敗する
   */
  private async executeCalledMove(
    battle: Battle,
    currentUser: BattlePokemonStatus,
    currentTarget: BattlePokemonStatus,
    request: CalledMoveRequest,
    depth = 1,
  ): Promise<string> {
    if (depth > MoveExecutorService.MAX_CALLED_MOVE_DEPTH) {
      return 'But it failed';
    }
    const move =
      request.moveId !== undefined
        ? await this.moveRepository.findById(request.moveId)
        : request.moveName
          ? await this.moveRepository.findByName?.(request.moveName)
          : null;
    if (!move) {
      return 'But it failed';
    }
    const requestedUser = request.user ?? currentUser;
    const requestedTarget =
      request.target ?? (requestedUser.id === currentUser.id ? currentTarget : currentUser);
    const user =
      (await this.battleRepository.findBattlePokemonStatusById(requestedUser.id)) ?? requestedUser;
    const target =
      (await this.battleRepository.findBattlePokemonStatusById(requestedTarget.id)) ??
      requestedTarget;
    if (user.isFainted()) {
      return 'But it failed';
    }
    const userTrainedPokemon = await this.trainedPokemonRepository.findById(user.trainedPokemonId);
    const targetTrainedPokemon = await this.trainedPokemonRepository.findById(
      target.trainedPokemonId,
    );
    if (!userTrainedPokemon || !targetTrainedPokemon) {
      return 'But it failed';
    }
    const latestBattle = (await this.battleRepository.findById(battle.id)) ?? battle;
    const result = await this.useMove({
      battle: latestBattle,
      move,
      attacker: user,
      defender: target,
      battlePokemonMoveId: undefined,
      options: {},
      attackerTrainedPokemon: userTrainedPokemon,
      defenderTrainedPokemon: targetTrainedPokemon,
      called: {
        calledBy: request.calledBy,
        powerMultiplier: request.powerMultiplier,
        depth,
      },
    });
    return result.message;
  }

  /**
   * 相手が技を出し終えたあとの、自分の特性の onOpponentMoveUsed（おどりこ）
   */
  private async runOpponentMoveObservers(params: {
    battle: Battle;
    move: Move;
    userId: number;
    observerId: number;
    observerTrainedPokemon: TrainedPokemon;
    options: ExecuteMoveOptions;
  }): Promise<string[]> {
    const abilityName = params.observerTrainedPokemon.ability?.name;
    const abilityEffect = abilityName ? AbilityRegistry.get(abilityName) : undefined;
    if (!abilityEffect?.onOpponentMoveUsed) {
      return [];
    }
    const observer = await this.battleRepository.findBattlePokemonStatusById(params.observerId);
    const user = await this.battleRepository.findBattlePokemonStatusById(params.userId);
    if (!observer || !user || observer.isFainted()) {
      return [];
    }
    const userTrainedPokemon = await this.trainedPokemonRepository.findById(user.trainedPokemonId);
    if (!userTrainedPokemon) {
      return [];
    }
    const latestBattle = (await this.battleRepository.findById(params.battle.id)) ?? params.battle;
    // おどりこが自分で技を出すときは、おどりこを持つポケモンが使用者になる
    const context = this.createHitContext({
      battle: latestBattle,
      move: params.move,
      moveEffect: MoveRegistry.get(params.move.name),
      attacker: user,
      defender: observer,
      attackerTrainedPokemon: userTrainedPokemon,
      defenderTrainedPokemon: params.observerTrainedPokemon,
      attackerAbilityEffect: undefined,
      defenderAbilityEffect: undefined,
      options: params.options,
    });
    context.callMove = request =>
      this.executeCalledMove(latestBattle, observer, user, {
        ...request,
        user: request.user ?? observer,
      });
    const message = await abilityEffect.onOpponentMoveUsed(observer, user, context);
    return message ? [message] : [];
  }

  /**
   * 技の本体（特性の無効化・命中判定・ダメージ・追加効果）
   */
  private async runMoveBody(params: MoveUseParams): Promise<MoveUseResult> {
    const { battle, move, defender, options, called } = params;
    const { attackerTrainedPokemon, defenderTrainedPokemon } = params;
    const attacker = params.attacker;

    const moveEffect = MoveRegistry.get(move.name);
    const attackerAbilityName = attackerTrainedPokemon.ability?.name;
    const defenderAbilityName = defenderTrainedPokemon.ability?.name;
    const attackerAbilityEffect = attackerAbilityName
      ? AbilityRegistry.get(attackerAbilityName)
      : undefined;
    // かたやぶり系の特性を持つ場合、防御側の特性効果は無視する
    const defenderAbilityEffect =
      defenderAbilityName &&
      !AbilityRegistry.isIgnoredByMoldBreaker(attackerAbilityName, defenderAbilityName)
        ? AbilityRegistry.get(defenderAbilityName)
        : undefined;
    // ヒットの前後で呼ぶ防御側特性は、かたやぶりでも無視しない（じきゅうりょく・さめはだなど）
    const defenderEventEffect = defenderAbilityName
      ? AbilityRegistry.get(defenderAbilityName)
      : undefined;

    // バトルコンテキストを作成（技の特殊効果・特性のフック用）
    const battleContext = this.createHitContext({
      battle,
      move,
      moveEffect,
      attacker,
      defender,
      attackerTrainedPokemon,
      defenderTrainedPokemon,
      attackerAbilityEffect,
      defenderAbilityEffect,
      options,
      called,
    });

    // ダメージ技かどうか。威力が null の攻撃技（おしおきなど）は modifyMovePower があればダメージ技として扱う
    const isDamagingMove =
      move.category !== 'Status' &&
      (move.power !== null || moveEffect?.modifyMovePower !== undefined);
    const targetsOpponent = MoveFlags.targetsOpponent(move.name) && defender.id !== attacker.id;

    // 攻撃側特性の modifyPriority を反映した優先度（じょおうのいげんなどの判定用）
    battleContext.effectivePriority =
      attackerAbilityEffect?.modifyPriority?.(attacker, move.priority, battleContext) ??
      move.priority;

    // 特性による技の失敗（しめりけ・じょおうのいげんなど）。両者の特性で、命中判定の前に判定する
    const preventingAbilityName = this.findMovePreventingAbility({
      attacker,
      defender,
      attackerAbilityName,
      defenderAbilityName,
      attackerAbilityEffect,
      defenderAbilityEffect,
      battleContext,
    });
    if (preventingAbilityName) {
      return {
        message: `Used ${move.name} but it failed (${preventingAbilityName})`,
        outcome: 'failed',
      };
    }

    // 技そのものの無効化（ぼうおん・ぼうだんなど）。変化技も含め、命中判定の前に判定する
    if (
      MoveFlags.targetsOpponent(move.name) &&
      defenderAbilityEffect?.isImmuneToMove?.(defender, battleContext) === true
    ) {
      // 無効にしたあとの防御側特性の効果（かぜのりの攻撃ランク+1など）
      const blockedMessage = await defenderAbilityEffect.onMoveBlocked?.(defender, battleContext);
      return {
        message: blockedMessage
          ? `Used ${move.name} but it had no effect ${blockedMessage}`
          : `Used ${move.name} but it had no effect`,
        outcome: 'failed',
      };
    }

    // 技の条件による失敗（ゆめくいは相手がねむりでなければ失敗）。命中判定の前に判定する
    if (moveEffect?.shouldFail?.(attacker, defender, battleContext) === true) {
      return { message: `Used ${move.name} but it failed`, outcome: 'failed' };
    }

    // そらをとぶ・あなをほるなどで隠れている相手には、決まった技しか当たらない（ロックオン中は当たる）
    if (targetsOpponent && !this.canReachSemiInvulnerable(attacker, defender, move)) {
      return this.missed(move, moveEffect, attacker, defender, battleContext);
    }

    // 命中率判定（変化技の場合は常に命中とみなす）
    if (isDamagingMove) {
      const hit = AccuracyCalculator.checkHit(
        move.accuracy,
        attacker,
        defender,
        attackerAbilityName,
        defenderAbilityName,
        battleContext,
      );

      if (!hit) {
        return this.missed(move, moveEffect, attacker, defender, battleContext);
      }
    }

    // みがわりがあると、相手を対象にする変化技は失敗する（音技など bypassSubstitute の技とすりぬけを除く）
    const bypassesSubstitute =
      !targetsOpponent ||
      MoveBehaviors.has(move.name, 'bypassSubstitute') ||
      attackerAbilityEffect?.infiltrates === true;

    // 変化技の場合はダメージなし
    if (!isDamagingMove) {
      if (defender.volatileState.substituteHp !== undefined && !bypassesSubstitute) {
        return { message: `Used ${move.name} but it failed`, outcome: 'failed' };
      }
      // 変化技の特殊効果（onUse）を呼び出す
      let moveEffectMessage: string | null = null;
      if (moveEffect?.onUse) {
        moveEffectMessage = await moveEffect.onUse(attacker, defender, battleContext);
      }

      return {
        message: moveEffectMessage ? `Used ${move.name} ${moveEffectMessage}` : `Used ${move.name}`,
        outcome: 'hit',
      };
    }

    // 追加効果の確率倍率（てんのめぐみ）と、相手への追加効果の無効化（りんぷん）
    battleContext.secondaryEffectChanceMultiplier =
      attackerAbilityEffect?.secondaryEffectChanceMultiplier;
    battleContext.secondaryEffectsSuppressed =
      defenderAbilityEffect?.blocksSecondaryEffects === true;

    let currentAttacker = attacker;
    let updatedDefender = defender;

    // 技のタイプを決定（技の効果 → 攻撃側特性の順）。beforeDamage（シャドースチールなど）で使うため先に決める
    const moveType = await this.resolveMoveType(
      move,
      moveEffect,
      attacker,
      defender,
      attackerAbilityEffect,
      battleContext,
    );
    battleContext.moveTypeName = moveType.name;

    // ダメージ計算の入力（攻撃側・防御側はその時点の最新の状態を使う）
    const typeEffectiveness = await this.typeEffectivenessRepository.getTypeEffectivenessMap();
    const createDamageParams = (
      power: number | null,
      baseDamageRatio?: number,
    ): DamageCalculationParams => ({
      attacker: currentAttacker,
      defender: updatedDefender,
      move: { power, typeId: moveType.id, category: move.category, accuracy: move.accuracy },
      moveType,
      attackerTypes: {
        primary: attackerTrainedPokemon.pokemon.primaryType,
        secondary: attackerTrainedPokemon.pokemon.secondaryType,
      },
      defenderTypes: {
        primary: defenderTrainedPokemon.pokemon.primaryType,
        secondary: defenderTrainedPokemon.pokemon.secondaryType,
      },
      typeEffectiveness,
      weather: battleContext.weather ?? null,
      field: battle.field,
      attackerAbilityName,
      defenderAbilityName,
      attackerStats: battleContext.attackerStats,
      defenderStats: battleContext.defenderStats,
      battle,
      // ヒットごとの値（hitIndex など）を固定するため、その時点のコピーを渡す
      battleContext: { ...battleContext },
      attackStatOverride: moveEffect?.attackStatOverride,
      ignoresBurnPenalty: moveEffect?.ignoresBurnPenalty,
      baseDamageRatio,
    });

    // 技全体のタイプ相性（0 なら技が相手に効かない。シャドースチールはランクを奪わない）
    battleContext.moveTypeEffectiveness = DamageCalculator.calculateMoveEffectiveness(
      createDamageParams(move.power),
    );

    // ダメージ計算前の技の効果（連続技の回数決定、シャドースチールのランクを奪う効果など）
    if (moveEffect?.beforeDamage) {
      await moveEffect.beforeDamage(attacker, defender, move, battleContext);
      // beforeDamage でランクなどが変わることがあるため、最新の状態を取り直す
      currentAttacker =
        (await this.battleRepository.findBattlePokemonStatusById(attacker.id)) ?? attacker;
      updatedDefender =
        (await this.battleRepository.findBattlePokemonStatusById(defender.id)) ?? defender;
      battleContext.attacker = currentAttacker;
      battleContext.defender = updatedDefender;
    }

    // 技の威力を決定（さきどりで呼ばれた技は 1.5 倍）
    const basePower =
      moveEffect?.modifyMovePower?.(currentAttacker, updatedDefender, battleContext) ?? move.power;
    // 威力が決まらなかった場合はダメージを与えない
    if (basePower === null) {
      return { message: `Used ${move.name}`, outcome: 'failed', moveTypeName: moveType.name };
    }
    const power =
      called?.powerMultiplier !== undefined
        ? modifyByFixedPoint(basePower, Math.round(called.powerMultiplier * 4096))
        : basePower;
    battleContext.movePower = power;

    // ヒットごとの基礎ダメージの倍率（連続技・おやこあいの追加ヒット）。威力はどのヒットも同じ
    const hitDamageRatios = this.resolveHitDamageRatios(
      currentAttacker,
      attackerAbilityEffect,
      battleContext,
    );
    if (hitDamageRatios.length > 1) {
      battleContext.multiHitCount = hitDamageRatios.length;
    }

    // ヒットごとにダメージを計算して適用
    // damage は実際に減らしたHPの合計（残りHPを超えた分は含めない。反動などはこの値を使う）
    let damage = 0;
    let substituteDamage = 0;
    let substituteBroke = false;
    let hitCount = 0;
    const hpBeforeMove = updatedDefender.currentHp;
    const hitEventMessages: string[] = [];
    const createHitResult = (hitDamage: number, hpBefore: number, hitIndex: number): HitResult => ({
      damage: hitDamage,
      hpBefore,
      hitIndex,
      hitCount,
      isContact: isContactMove(battleContext),
      moveTypeName: moveType.name,
      moveCategory: move.category,
      targetFainted: updatedDefender.isFainted(),
    });
    for (const [hitIndex, hitDamageRatio] of hitDamageRatios.entries()) {
      battleContext.hitIndex = hitIndex;
      const hitDamage = await DamageCalculator.calculate(createDamageParams(power, hitDamageRatio));

      // みがわりがあれば、HP の代わりにみがわりにダメージを与える（追加効果・接触時の特性は起きない）
      const substituteHp = updatedDefender.volatileState.substituteHp;
      if (substituteHp !== undefined && !bypassesSubstitute && hitDamage > 0) {
        const dealtToSubstitute = Math.min(substituteHp, hitDamage);
        const remaining = substituteHp - dealtToSubstitute;
        await this.battleRepository.patchVolatileState(defender.id, {
          substituteHp: remaining > 0 ? remaining : null,
        });
        updatedDefender =
          (await this.battleRepository.findBattlePokemonStatusById(defender.id)) ?? updatedDefender;
        battleContext.defender = updatedDefender;
        substituteDamage += dealtToSubstitute;
        substituteBroke = substituteBroke || remaining <= 0;
        hitCount += 1;
        continue;
      }

      // ダメージを適用
      const hpBeforeHit = updatedDefender.currentHp;
      const newHp = Math.max(0, hpBeforeHit - hitDamage);
      const dealtDamage = hpBeforeHit - newHp;
      await this.battleRepository.updateBattlePokemonStatus(defender.id, {
        currentHp: newHp,
      });

      // 更新後のdefenderを取得（次のヒットと状態異常付与のために最新の状態を取得）
      const latestDefender = await this.battleRepository.findBattlePokemonStatusById(defender.id);
      if (!latestDefender) {
        throw new NotFoundException('Defender BattlePokemonStatus', defender.id);
      }
      updatedDefender = latestDefender;
      battleContext.defender = latestDefender;
      damage += dealtDamage;
      hitCount += 1;

      // ヒットごとの特性（防御側の onDamagingHit → 攻撃側の onSourceDamagingHit）
      if (
        dealtDamage > 0 &&
        (defenderEventEffect?.onDamagingHit || attackerAbilityEffect?.onSourceDamagingHit)
      ) {
        // 特性で能力ランク・HP・状態異常が変わるため、そのたびに両者の状態を取り直す
        const refreshStatuses = async (): Promise<void> => {
          currentAttacker =
            (await this.battleRepository.findBattlePokemonStatusById(attacker.id)) ??
            currentAttacker;
          updatedDefender =
            (await this.battleRepository.findBattlePokemonStatusById(defender.id)) ??
            updatedDefender;
          battleContext.attacker = currentAttacker;
          battleContext.defender = updatedDefender;
        };
        const hit = createHitResult(dealtDamage, hpBeforeHit, hitIndex);
        let defenderMessage: string | null = null;
        if (defenderEventEffect?.onDamagingHit) {
          defenderMessage = await defenderEventEffect.onDamagingHit(
            updatedDefender,
            currentAttacker,
            hit,
            battleContext,
          );
          // 攻撃側の特性に、防御側の特性で変わったあとの状態を渡す（わたげの素早さ低下など）
          await refreshStatuses();
        }
        let attackerMessage: string | null = null;
        if (attackerAbilityEffect?.onSourceDamagingHit) {
          attackerMessage = await attackerAbilityEffect.onSourceDamagingHit(
            currentAttacker,
            updatedDefender,
            hit,
            battleContext,
          );
          // 次のヒットのために取り直す
          await refreshStatuses();
        }
        hitEventMessages.push(
          ...[defenderMessage, attackerMessage].filter((m): m is string => Boolean(m)),
        );
      }

      // 無効化された・どちらかがひんしになった場合は残りのヒットをしない
      if (hitDamage === 0 || updatedDefender.isFainted() || currentAttacker.isFainted()) {
        break;
      }
    }

    // みがわりにだけ当たったときは、反動・吸収（afterDamage）だけを起こす（本家と同じ）
    if (damage === 0 && substituteDamage > 0) {
      battleContext.hitSubstitute = true;
      const latestAttacker =
        (await this.battleRepository.findBattlePokemonStatusById(attacker.id)) ?? currentAttacker;
      const afterSubstituteMessage = moveEffect?.afterDamage
        ? await moveEffect.afterDamage(
            latestAttacker,
            updatedDefender,
            substituteDamage,
            battleContext,
          )
        : null;
      const brokeMessage = substituteBroke ? ' The substitute broke!' : '';
      const afterMessage = afterSubstituteMessage ? ` ${afterSubstituteMessage}` : '';
      return {
        message: `Used ${move.name} and hit the substitute (${substituteDamage} damage)${brokeMessage}${afterMessage}`,
        outcome: 'hit',
        moveTypeName: moveType.name,
      };
    }

    // タイプ無効化が発動した場合（ダメージが0の場合）、HP回復などの効果を処理
    if (damage === 0 && defenderTrainedPokemon?.ability) {
      const abilityEffect = AbilityRegistry.get(defenderTrainedPokemon.ability.name);
      if (abilityEffect?.onAfterTakingDamage) {
        // タイプ無効化が発動したことを示すために、元のダメージとして0を渡す
        await abilityEffect.onAfterTakingDamage(updatedDefender, 0, battleContext);
      }
    }

    // 受けた技を記録する（テクスチャー２が読む）
    if (damage > 0) {
      await this.battleRepository.patchVolatileState(defender.id, { lastHitByMoveId: move.id });
    }

    // 接触技による状態異常付与（防御側の特性）
    let contactEffectMessage = '';
    // 技の追加効果に渡すポケモンの状態（接触時の特性で変わった場合は取得し直す）
    let attackerForMoveEffect = currentAttacker;
    let defenderForMoveEffect = updatedDefender;
    if (damage > 0 && defenderEventEffect?.applyContactStatusCondition) {
      const applied = await defenderEventEffect.applyContactStatusCondition(
        updatedDefender,
        currentAttacker,
        battleContext,
      );
      if (applied) {
        contactEffectMessage = ` ${defenderAbilityName} activated!`;
        // くだけるよろい（防御側）やぬめぬめ（攻撃側）などで能力ランク・状態異常が変わるため、
        // 追加効果が古い状態で上書きしないよう最新の状態を取得し直す
        attackerForMoveEffect =
          (await this.battleRepository.findBattlePokemonStatusById(attacker.id)) ?? currentAttacker;
        defenderForMoveEffect =
          (await this.battleRepository.findBattlePokemonStatusById(defender.id)) ?? updatedDefender;
      }
    }

    // くちばしキャノンをためている相手に接触技を当てると、やけどになる
    if (
      damage > 0 &&
      isContactMove(battleContext) &&
      defenderForMoveEffect.volatileState.beakBlast === true
    ) {
      const { inflicted } = await tryInflictStatus(
        attackerForMoveEffect,
        StatusCondition.Burn,
        battleContext,
        { source: { pokemon: defenderForMoveEffect, kind: 'other', name: 'くちばしキャノン' } },
      );
      if (inflicted) {
        contactEffectMessage += ' was burned by Beak Blast!';
        attackerForMoveEffect =
          (await this.battleRepository.findBattlePokemonStatusById(attacker.id)) ??
          attackerForMoveEffect;
      }
    }

    // 技の特殊効果（onHit）を呼び出す
    let moveEffectMessage = '';
    if (moveEffect?.onHit) {
      const hitMessage = await moveEffect.onHit(
        attackerForMoveEffect,
        defenderForMoveEffect,
        battleContext,
      );
      if (hitMessage) {
        moveEffectMessage = ` ${hitMessage}`;
      }
    }

    // ダメージ適用後の技の効果（反動など）。全ヒットで実際に減らしたHPの合計を渡す
    if (moveEffect?.afterDamage) {
      const afterDamageMessage = await moveEffect.afterDamage(
        attackerForMoveEffect,
        defenderForMoveEffect,
        damage,
        battleContext,
      );
      if (afterDamageMessage) {
        moveEffectMessage += ` ${afterDamageMessage}`;
      }
    }

    // 技全体のあとの特性（防御側の onAfterMoveHit → 相手をひんしにした攻撃側の onKnockOut）
    const afterMoveMessages = await this.runAfterMoveHooks({
      attackerId: attacker.id,
      defenderId: defender.id,
      attackerAbilityEffect,
      defenderEventEffect,
      createMoveHit: () => createHitResult(damage, hpBeforeMove, hitCount - 1),
      damage,
      battleContext,
    });

    // 倒した相手のみちづれ・おんねん
    const faintedDefender =
      (await this.battleRepository.findBattlePokemonStatusById(defender.id)) ?? updatedDefender;
    const faintMessages =
      damage > 0
        ? await this.moveLifecycle.applyFaintReactions({
            attacker: currentAttacker,
            fainted: faintedDefender,
            move,
            battleContext,
          })
        : [];

    const hitCountMessage = hitCount > 1 ? ` (hit ${hitCount} times)` : '';
    const eventMessage = hitEventMessages.map(message => ` ${message}`).join('');
    const afterMoveMessage = [...afterMoveMessages, ...faintMessages]
      .map(message => ` ${message}`)
      .join('');
    return {
      message: `Used ${move.name} and dealt ${damage} damage${hitCountMessage}${contactEffectMessage}${eventMessage}${moveEffectMessage}${afterMoveMessage}`,
      outcome: damage > 0 ? 'hit' : 'failed',
      moveTypeName: moveType.name,
    };
  }

  /**
   * 技が外れたとき（技の onMiss を呼ぶ）
   */
  private async missed(
    move: Move,
    moveEffect: IMoveEffect | undefined,
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<MoveUseResult> {
    if (moveEffect?.onMiss) {
      const missMessage = await moveEffect.onMiss(attacker, defender, battleContext);
      if (missMessage) {
        return { message: `Used ${move.name} but it missed. ${missMessage}`, outcome: 'missed' };
      }
    }
    return { message: `Used ${move.name} but it missed`, outcome: 'missed' };
  }

  /**
   * そらをとぶ・あなをほるなどで隠れている相手に、この技が届くか
   * 隠れていなければ届く。ロックオン・こころのめ（使用者の lockOnTurns）があれば届く
   */
  private canReachSemiInvulnerable(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    move: Move,
  ): boolean {
    const kind = defender.volatileState.semiInvulnerable;
    if (kind === undefined || attacker.volatileState.lockOnTurns !== undefined) {
      return true;
    }
    return MoveBehaviors.hitsSemiInvulnerable(kind, move.name);
  }

  /**
   * 技全体のあとの特性を呼ぶ
   * - 防御側の onAfterMoveHit: 合計ダメージが1以上のとき（いかりのこうら・ぎゃくじょう）
   * - 攻撃側の onKnockOut: 相手がひんしで、自分がひんしでないとき（じしんかじょうなど）
   * @returns 特性のメッセージ
   */
  private async runAfterMoveHooks(params: {
    attackerId: number;
    defenderId: number;
    attackerAbilityEffect: IAbilityEffect | undefined;
    defenderEventEffect: IAbilityEffect | undefined;
    createMoveHit: () => HitResult;
    damage: number;
    battleContext: BattleContext;
  }): Promise<string[]> {
    const { attackerAbilityEffect, defenderEventEffect, battleContext } = params;
    if (!defenderEventEffect?.onAfterMoveHit && !attackerAbilityEffect?.onKnockOut) {
      return [];
    }

    const messages: Array<string | null | undefined> = [];
    let attacker = await this.battleRepository.findBattlePokemonStatusById(params.attackerId);
    let defender = await this.battleRepository.findBattlePokemonStatusById(params.defenderId);
    if (!attacker || !defender) {
      return [];
    }

    if (params.damage > 0 && defenderEventEffect?.onAfterMoveHit) {
      messages.push(
        await defenderEventEffect.onAfterMoveHit(
          defender,
          attacker,
          params.createMoveHit(),
          battleContext,
        ),
      );
      attacker = (await this.battleRepository.findBattlePokemonStatusById(attacker.id)) ?? attacker;
      defender = (await this.battleRepository.findBattlePokemonStatusById(defender.id)) ?? defender;
    }

    if (defender.isFainted() && !attacker.isFainted() && attackerAbilityEffect?.onKnockOut) {
      messages.push(await attackerAbilityEffect.onKnockOut(attacker, defender, battleContext));
    }

    return messages.filter((message): message is string => Boolean(message));
  }

  /**
   * ヒット共通のコンテキストを作成
   * 技フラグは攻撃側特性の modifyMoveFlags を、無視するランクは技と両者の特性を反映する
   */
  private createHitContext(params: {
    battle: Battle;
    move: Move;
    moveEffect: IMoveEffect | undefined;
    attacker: BattlePokemonStatus;
    defender: BattlePokemonStatus;
    attackerTrainedPokemon: TrainedPokemon;
    defenderTrainedPokemon: TrainedPokemon;
    attackerAbilityEffect: IAbilityEffect | undefined;
    defenderAbilityEffect: IAbilityEffect | undefined;
    options: ExecuteMoveOptions;
    called?: CalledMoveInfo;
  }): BattleContext {
    const { battle, move, attacker, defender } = params;
    const attackerAbilityName = params.attackerTrainedPokemon.ability?.name;
    const defenderAbilityName = params.defenderTrainedPokemon.ability?.name;
    const context: BattleContext = {
      battle,
      battleRepository: this.battleRepository,
      trainedPokemonRepository: this.trainedPokemonRepository,
      weather: resolveEffectiveWeather(battle.weather, [attackerAbilityName, defenderAbilityName]),
      field: battle.field,
      moveName: move.name,
      moveTypeName: move.type.name,
      baseMoveTypeName: move.type.name,
      moveCategory: move.category,
      movePower: move.power,
      movePriority: move.priority,
      attackerAbilityName,
      defenderAbilityName,
      attacker,
      defender,
      attackerStats: applyStatOverrides(
        this.calculateStats(params.attackerTrainedPokemon),
        attacker.volatileState,
      ),
      defenderStats: applyStatOverrides(
        this.calculateStats(params.defenderTrainedPokemon),
        defender.volatileState,
      ),
      isLastToMove: params.options.isLastToMove,
      hasRecoil: params.moveEffect?.hasRecoil === true,
      moveId: move.id,
      moveRepository: this.moveRepository,
      defenderPendingMoveId: params.options.defenderPendingMoveId,
      calledBy: params.called?.calledBy,
      attackerEffectiveStatus: this.effectiveStatusOf(attacker, params.attackerTrainedPokemon),
      defenderEffectiveStatus: this.effectiveStatusOf(defender, params.defenderTrainedPokemon),
    };
    context.callMove = request =>
      this.executeCalledMove(
        battle,
        context.attacker ?? attacker,
        context.defender ?? defender,
        request,
        (params.called?.depth ?? 0) + 1,
      );

    const baseFlags = MoveFlags.get(move.name);
    context.moveFlags =
      params.attackerAbilityEffect?.modifyMoveFlags?.(attacker, baseFlags, context) ?? baseFlags;

    context.ignoredDefenderRanks = new Set<StatType>([
      ...(params.moveEffect?.ignoredDefenderRanks ?? []),
      ...(params.attackerAbilityEffect?.ignoreOpponentRanks?.(attacker, 'attacker', context) ?? []),
    ]);
    context.ignoredAttackerRanks = new Set<StatType>(
      params.defenderAbilityEffect?.ignoreOpponentRanks?.(defender, 'defender', context) ?? [],
    );

    return context;
  }

  /**
   * 状態異常として扱う状態（状態異常があればそれ、なければ特性の treatedAsStatusCondition）
   */
  private effectiveStatusOf(
    pokemon: BattlePokemonStatus,
    trainedPokemon: TrainedPokemon,
  ): StatusCondition | null {
    if (isMajorStatus(pokemon.statusCondition)) {
      return pokemon.statusCondition;
    }
    const abilityName = trainedPokemon.ability?.name;
    return (
      (abilityName ? AbilityRegistry.get(abilityName)?.treatedAsStatusCondition : null) ?? null
    );
  }

  /**
   * 技を失敗させる特性（preventsMove）を探し、その特性名を返す
   * 攻撃側 → 防御側の順に判定する。防御側の特性効果は、かたやぶりで無視されたものなら渡さない
   */
  private findMovePreventingAbility(params: {
    attacker: BattlePokemonStatus;
    defender: BattlePokemonStatus;
    attackerAbilityName: string | undefined;
    defenderAbilityName: string | undefined;
    attackerAbilityEffect: IAbilityEffect | undefined;
    defenderAbilityEffect: IAbilityEffect | undefined;
    battleContext: BattleContext;
  }): string | undefined {
    const { battleContext } = params;
    if (params.attackerAbilityEffect?.preventsMove?.(params.attacker, 'attacker', battleContext)) {
      return params.attackerAbilityName;
    }
    if (params.defenderAbilityEffect?.preventsMove?.(params.defender, 'defender', battleContext)) {
      return params.defenderAbilityName;
    }
    return undefined;
  }

  /**
   * 技のタイプを決定する（技の modifyMoveType → 攻撃側特性の modifyMoveType）
   * タイプ名が変わった場合はリポジトリからタイプを引く。見つからない場合は技本来のタイプを使う
   * タイプなしの技（技の typeless。わるあがき）は、modifyMoveType を呼ばずにタイプなしを返す
   */
  private async resolveMoveType(
    move: Move,
    moveEffect: IMoveEffect | undefined,
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    attackerAbilityEffect: IAbilityEffect | undefined,
    battleContext: BattleContext,
  ): Promise<Type> {
    // タイプなしの技（わるあがき）は、どの効果でもタイプが変わらない
    if (moveEffect?.typeless === true) {
      return MoveExecutorService.createTypelessType();
    }
    let typeName =
      moveEffect?.modifyMoveType?.(attacker, defender, battleContext) ?? move.type.name;
    battleContext.moveTypeName = typeName;
    typeName =
      attackerAbilityEffect?.modifyMoveType?.(attacker, typeName, battleContext) ?? typeName;

    if (typeName === move.type.name) {
      return move.type;
    }
    return (await this.typeEffectivenessRepository.findTypeByName(typeName)) ?? move.type;
  }

  /**
   * ヒットごとの基礎ダメージの倍率を返す（undefined は倍率なし）。要素の数がヒット数になる
   * - 連続技（battleContext.multiHitCount が2以上）: 倍率なしを回数分
   * - 単発技: 攻撃側特性の getAdditionalHitDamageRatios（おやこあい）で追加ヒットを加える。
   *   追加ヒットの倍率は DamageCalculator が基礎ダメージ（+2 のあと）に 4096 分率で掛ける（本家と同じ）
   */
  private resolveHitDamageRatios(
    attacker: BattlePokemonStatus,
    attackerAbilityEffect: IAbilityEffect | undefined,
    battleContext: BattleContext,
  ): Array<number | undefined> {
    const multiHitCount = battleContext.multiHitCount ?? 1;
    if (multiHitCount > 1) {
      return Array.from({ length: multiHitCount }, () => undefined);
    }
    const ratios =
      attackerAbilityEffect?.getAdditionalHitDamageRatios?.(attacker, battleContext) ?? [];
    return [undefined, ...ratios];
  }

  /**
   * タイプなしを表すタイプ（タイプ相性表にもポケモンのタイプにもない ID を使う）
   */
  private static createTypelessType(): Type {
    return new Type(MoveExecutorService.CONFUSION_NON_EXISTENT_TYPE_ID, 'なし', 'none');
  }

  /**
   * TrainedPokemonから実際のステータス値を計算
   */
  private calculateStats(trainedPokemon: TrainedPokemon): {
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  } {
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

    return {
      attack: stats.attack,
      defense: stats.defense,
      specialAttack: stats.specialAttack,
      specialDefense: stats.specialDefense,
      speed: stats.speed,
    };
  }

  /**
   * 混乱による自分へのダメージを計算
   * 混乱の自傷ダメージはタイプなしで威力40の物理攻撃として計算
   * 特性のフックは呼ばない（本家の getConfusionDamage と同じく、特性の補正を受けない）
   * @param battle バトル
   * @param attacker 攻撃側（自分自身）
   * @param attackerTrainedPokemon 攻撃側の育成個体
   * @returns 受けるダメージ
   */
  private async calculateConfusionSelfDamage(
    battle: Battle,
    attacker: BattlePokemonStatus,
    attackerTrainedPokemon: TrainedPokemon,
  ): Promise<number> {
    // 実際のステータス値を計算
    const attackerStats = this.calculateStats(attackerTrainedPokemon);

    // 混乱の自傷ダメージはタイプなしで威力40の物理攻撃
    // タイプなしの技を作成（タイプ相性は1.0倍、タイプ一致もなし）
    // タイプ相性を1.0倍として扱うため、タイプ相性マップに存在しないタイプIDを使用する
    // タイプ一致を適用しないため、ポケモンのタイプと一致しないタイプIDを使用する
    const nonExistentType = MoveExecutorService.createTypelessType(); // タイプなしを表現
    const confusionMoveInfo: MoveInfo = {
      power: 40,
      typeId: MoveExecutorService.CONFUSION_NON_EXISTENT_TYPE_ID, // 存在しないタイプIDを使用（タイプ相性は1.0倍、タイプ一致もなし）
      category: 'Physical',
      accuracy: null, // 必中
    };

    // タイプ相性を1.0倍として扱うため、タイプ相性マップを空にする
    // タイプ相性マップに存在しないタイプIDを使用することで、タイプ相性が1.0倍として扱われる
    const emptyTypeEffectiveness = new Map<string, number>();

    // 自分自身を攻撃する（attacker = defender）
    const damage = await DamageCalculator.calculate({
      attacker,
      defender: attacker, // 自分自身
      move: confusionMoveInfo,
      moveType: nonExistentType,
      attackerTypes: {
        primary: attackerTrainedPokemon.pokemon.primaryType,
        secondary: attackerTrainedPokemon.pokemon.secondaryType,
      },
      defenderTypes: {
        primary: attackerTrainedPokemon.pokemon.primaryType,
        secondary: attackerTrainedPokemon.pokemon.secondaryType,
      },
      typeEffectiveness: emptyTypeEffectiveness, // タイプ相性を1.0倍として扱う
      weather: battle.weather,
      field: battle.field,
      // 混乱の自傷は能力値とランクだけで決まり、特性の補正・無効化を受けない（テクニシャン・ふしぎなまもりなど）
      attackerAbilityName: undefined,
      defenderAbilityName: undefined,
      attackerStats: attackerStats,
      defenderStats: attackerStats, // 自分自身なので同じステータス
      battle,
    });

    return damage;
  }
}
