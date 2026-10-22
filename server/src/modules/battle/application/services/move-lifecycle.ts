import { Battle, Weather } from '../../domain/entities/battle.entity';
import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '../../domain/entities/status-condition.enum';
import { IBattleRepository } from '../../domain/battle.repository.interface';
import { STRUGGLE_MOVE_NAME } from '../../domain/logic/move-selection';
import { MutableStatePatch, isEmptyObject } from '../../domain/state/state-field-parser';
import {
  VOLATILE_UNTIL_NEXT_MOVE_FLAGS,
  VolatileState,
  clearVolatileOnBeforeMove,
} from '../../domain/state/volatile-state';
import { getSideConditions } from '../../domain/state/side-state';
import { NotFoundException } from '@/shared/domain/exceptions';
import { Move } from '@/modules/pokemon/domain/entities/move.entity';
import {
  IMoveEffect,
  LockedInMoveConfig,
} from '@/modules/pokemon/domain/moves/move-effect.interface';
import { IAbilityEffect } from '@/modules/pokemon/domain/abilities/ability-effect.interface';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { MoveBehaviors } from '@/modules/pokemon/domain/moves/move-behaviors';
import { MoveFlags } from '@/modules/pokemon/domain/moves/move-flags';
import { tryInflictStatus } from '@/modules/pokemon/domain/battle-events/status-infliction';
import { reducePp } from '@/modules/pokemon/domain/battle-events/pp';
import { resolveAbilityName } from '@/modules/pokemon/domain/battle-events/ability-lookup';
import { getContextWeather } from '@/modules/pokemon/domain/abilities/context-weather';
// まもる系の仕組み（Issue #102 #103 #107 #108 #120 一部）
import { keepsProtectCount } from '../../domain/logic/protection';

/**
 * 技を出した結果（技を出したあとの片付けに使う）
 * - hit: 技が効いた（ダメージを与えた、変化技を使った）
 * - missed: 外れた
 * - failed: 失敗した・効かなかった（特性での無効化、タイプ相性 0 など）
 * - charged: ため技の 1 ターン目
 */
export type MoveOutcome = 'hit' | 'missed' | 'failed' | 'charged';

/**
 * あばれる系（MoveBehaviors の lockedMove）の既定の設定: 2〜3 ターン出し続け、終わるとこんらんする
 */
const RAMPAGE_LOCKED_IN: LockedInMoveConfig = { turns: [2, 3], confusesAtEnd: true };

/**
 * じゅうでん（使ったときは charged を消さない）
 */
export const CHARGE_MOVE_NAME = 'じゅうでん';

/**
 * 効果のある天候がこれなら、ためずにすぐ出すため技（本家の onTryMove の effectiveWeather の判定）
 * - ソーラービーム・ソーラーブレード: 晴れ
 * - エレクトロビーム: 雨
 * 技の効果の chargeTurn.skipCharge がなくても、エンジンが判定する
 * 注: 晴れ・雨以外での威力半減（ソーラービーム）と、ためるときの特攻 +1（エレクトロビーム）は技の効果で行う
 */
const WEATHER_SKIP_CHARGE: Readonly<Record<string, Weather>> = {
  ソーラービーム: Weather.Sun,
  ソーラーブレード: Weather.Sun,
  エレクトロビーム: Weather.Rain,
};

/**
 * くちばしキャノン（撃ったら加熱 beakBlast が終わる）
 */
const BEAK_BLAST_MOVE_NAME = 'くちばしキャノン';

/**
 * さわぐで目を覚まさない特性（ぼうおん）
 */
const SOUNDPROOF_ABILITY_NAME = 'ぼうおん';

/**
 * みらいよち・はめつのねがいの残りターン数（使ったターンに書く。2 ターン後のターン終了時に当たる）
 */
export const FUTURE_ATTACK_TURNS = 3;

/**
 * MoveLifecycle
 * 技を出すときと出したあとに、エンジンが書く状態をまとめて扱う
 * - PP を減らす（プレッシャー・ものまねの入れ替え）
 * - 技を出した記録（lastMoveId・lastMoveTypeName・こだわり・まもるの回数・みちづれとおんねんの消去）
 * - ため技の 1 ターン目（chargingMoveId・semiInvulnerable）
 * - みらいよち・はめつのねがいを相手の陣営に置く（SideConditions.futureAttack）
 * - 技を出したあと（反動・出し続ける技・続けて出した回数・じゅうでんの消去・さわぐ）
 * - みちづれ・おんねん（技で倒されたとき）
 */
export class MoveLifecycle {
  constructor(private readonly battleRepository: IBattleRepository) {}

  /**
   * PP を減らす
   * 相手を対象にする技（と mustPressure の技）は、相手の特性の modifyOpponentPpDeduction（プレッシャー）の分も減らす
   * ものまね・へんしんで入れ替わった技は volatileState.moveSlotOverrides の PP を減らす
   */
  async consumePp(params: {
    attacker: BattlePokemonStatus;
    defender: BattlePokemonStatus;
    move: Move;
    battlePokemonMoveId: number;
    defenderEventEffect: IAbilityEffect | undefined;
    battleContext: BattleContext;
  }): Promise<void> {
    const { attacker, defender, move, battlePokemonMoveId } = params;
    const pressured =
      defender.id !== attacker.id &&
      (MoveFlags.targetsOpponent(move.name) || MoveBehaviors.has(move.name, 'mustPressure'));
    const extra = pressured
      ? (params.defenderEventEffect?.modifyOpponentPpDeduction?.(
          defender,
          attacker,
          params.battleContext,
        ) ?? 0)
      : 0;
    const amount = 1 + extra;

    const override = attacker.volatileState.moveSlotOverrides?.find(
      slot => slot.battlePokemonMoveId === battlePokemonMoveId && slot.moveId === move.id,
    );
    if (override) {
      await reducePp(attacker, move.id, amount, params.battleContext);
      return;
    }

    const battlePokemonMove =
      await this.battleRepository.findBattlePokemonMoveById(battlePokemonMoveId);
    if (!battlePokemonMove) {
      throw new NotFoundException('BattlePokemonMove', battlePokemonMoveId);
    }
    await this.battleRepository.updateBattlePokemonMove(battlePokemonMoveId, {
      currentPp: battlePokemonMove.consumePp(amount),
    });
  }

  /**
   * 技を出したことを記録する（技を出す前の判定を通ったあと、技の処理の前）
   * - 使用者: みちづれ・おんねんを消す、lastMoveId（変わったら consecutiveMoveCount も消す）、lastMoveTypeName、こだわり（locksMoveChoice の特性）、まもるの回数を消す
   * 呼ばれた技（isCalled）では、lastMoveTypeName だけを書き、ほかの記録は呼んだ技のままにする
   * （本家は呼ばれた技も lastMoveUsed にする。テクスチャー２が読む。lastMoveId は本家の lastMove で、呼んだ技のまま）
   * バトル全体の GlobalFieldState.lastMoveId は、技を出し終えたあとに MoveExecutorService.executeMove が書く
   * （技の処理の中では、まだ前の技のまま。まねっこが読む）
   * @returns 書き込んだあとの使用者
   */
  async recordMoveUse(params: {
    attacker: BattlePokemonStatus;
    move: Move;
    moveEffect: IMoveEffect | undefined;
    attackerAbilityEffect: IAbilityEffect | undefined;
    isCalled: boolean;
    /** 技のタイプを変える効果を反映したタイプ（lastMoveTypeName に書く。タイプなしの技は undefined） */
    moveTypeName?: string;
  }): Promise<BattlePokemonStatus> {
    const { attacker, move } = params;
    const state = attacker.volatileState;
    const patch: MutableStatePatch<VolatileState> = {};
    // 最後に使った技のタイプ（テクスチャー２が読む）。タイプなしの技（わるあがき）は前の値を消す
    if (state.lastMoveTypeName !== params.moveTypeName) {
      patch.lastMoveTypeName = params.moveTypeName ?? null;
    }
    if (params.isCalled) {
      return this.applyMoveRecord(attacker, patch);
    }

    if (clearVolatileOnBeforeMove(state) !== state) {
      for (const key of VOLATILE_UNTIL_NEXT_MOVE_FLAGS) {
        patch[key] = null;
      }
    }
    if (state.lastMoveId !== move.id) {
      patch.lastMoveId = move.id;
      // 別の技を出したら、続けて出した回数は 0 から数え直す（技の処理の中では「この技を直前に続けて成功させた回数」）
      if (state.consecutiveMoveCount !== undefined) {
        patch.consecutiveMoveCount = null;
      }
    }
    if (
      params.attackerAbilityEffect?.locksMoveChoice === true &&
      state.choiceLockedMoveId === undefined &&
      move.name !== STRUGGLE_MOVE_NAME
    ) {
      patch.choiceLockedMoveId = move.id;
    }
    if (state.protectCount !== undefined && !keepsProtectCount(params.moveEffect)) {
      patch.protectCount = null;
    }
    return this.applyMoveRecord(attacker, patch);
  }

  /**
   * 技を出した記録を書き、書いたあとの使用者を返す（書くものがなければそのまま）
   */
  private async applyMoveRecord(
    attacker: BattlePokemonStatus,
    patch: MutableStatePatch<VolatileState>,
  ): Promise<BattlePokemonStatus> {
    if (isEmptyObject(patch)) {
      return attacker;
    }
    await this.battleRepository.patchVolatileState(attacker.id, patch);
    return this.refresh(attacker);
  }

  /**
   * ため技の 1 ターン目なら、ためる（chargingMoveId と、隠れる技なら semiInvulnerable を書く）
   * 技の chargeTurn.skipCharge が true のとき、晴れのソーラービームなど（WEATHER_SKIP_CHARGE）は、ためずに出す
   * 2 ターン目なら、ためていた状態を消して技を出す
   * @returns ためたときは { charged: true, message }。技を出すときは { charged: false, attacker }
   */
  async handleChargeTurn(params: {
    attacker: BattlePokemonStatus;
    defender: BattlePokemonStatus;
    move: Move;
    moveEffect: IMoveEffect | undefined;
    battleContext: BattleContext;
  }): Promise<
    | { readonly charged: true; readonly message: string }
    | { readonly charged: false; readonly attacker: BattlePokemonStatus }
  > {
    const { attacker, move, moveEffect, battleContext } = params;
    const isChargeMove = MoveBehaviors.has(move.name, 'charge') || moveEffect?.chargeTurn;
    if (!isChargeMove) {
      return { charged: false, attacker };
    }
    if (attacker.volatileState.chargingMoveId === move.id) {
      await this.battleRepository.patchVolatileState(attacker.id, {
        chargingMoveId: null,
        semiInvulnerable: null,
      });
      return { charged: false, attacker: await this.refresh(attacker) };
    }
    if (
      moveEffect?.chargeTurn?.skipCharge?.(attacker, battleContext) === true ||
      (WEATHER_SKIP_CHARGE[move.name] !== undefined &&
        getContextWeather(battleContext) === WEATHER_SKIP_CHARGE[move.name])
    ) {
      return { charged: false, attacker };
    }

    const chargeMessage = await moveEffect?.chargeTurn?.onCharge?.(
      attacker,
      params.defender,
      battleContext,
    );
    const latest = await this.refresh(attacker);
    await this.battleRepository.patchVolatileState(latest.id, {
      chargingMoveId: move.id,
      semiInvulnerable: MoveBehaviors.semiInvulnerableKind(move.name) ?? null,
    });
    return {
      charged: true,
      message: chargeMessage
        ? `Used ${move.name} and began charging ${chargeMessage}`
        : `Used ${move.name} and began charging`,
    };
  }

  /**
   * 技を出したあとの片付け
   * - 反動（MoveBehaviors の recharge）: 効いたら mustRecharge を書く
   * - 出し続ける技（lockedIn / MoveBehaviors の lockedMove）: 残りターン数を書く。終わったらこんらんする技もある
   * - 続けて出した回数（consecutiveMoveCount）
   * - じゅうでん（charged）: でんき技を出したら消す（じゅうでんそのものは除く。外れても消す）
   * - くちばしキャノン: 撃ったら加熱（beakBlast）を消す
   * - さわぐ: 当たるたびに、場のねむっているポケモンを起こす（ぼうおんは起きない）。最後まで出したら、uproar は
   *   このターンの終わりまで残す（ターン終了時のあくびでも眠らない）
   *   注: 本家は技を当てる前（onTryHit）に起こすが、ここでは技が当たったときだけ起こす
   * @param moveTypeName 出した技のタイプ（タイプ変更の反映後。ダメージ技でなければ技本来のタイプ）
   * @returns メッセージ（こんらんした、など）
   */
  async afterMove(params: {
    attacker: BattlePokemonStatus;
    move: Move;
    moveEffect: IMoveEffect | undefined;
    outcome: MoveOutcome;
    isCalled: boolean;
    previousState: VolatileState;
    moveTypeName: string;
    battleContext: BattleContext;
  }): Promise<string | null> {
    const { move, outcome } = params;
    let attacker = await this.refresh(params.attacker);
    if (attacker.isFainted()) {
      return null;
    }
    const patch: MutableStatePatch<VolatileState> = {};

    if (
      attacker.volatileState.charged === true &&
      params.moveTypeName === 'でんき' &&
      move.name !== CHARGE_MOVE_NAME &&
      outcome !== 'charged'
    ) {
      patch.charged = null;
    }

    if (outcome === 'hit' && MoveBehaviors.has(move.name, 'recharge')) {
      patch.mustRecharge = true;
    }

    // くちばしキャノンを撃ったら加熱が終わる（本家の onAfterMove。このあとの接触技ではやけどにならない）
    if (move.name === BEAK_BLAST_MOVE_NAME && attacker.volatileState.beakBlast !== undefined) {
      patch.beakBlast = null;
    }

    if (outcome !== 'charged') {
      const previousCount =
        params.previousState.lastMoveId === move.id
          ? (params.previousState.consecutiveMoveCount ?? 0)
          : 0;
      if (!params.isCalled) {
        patch.consecutiveMoveCount = outcome === 'hit' ? previousCount + 1 : null;
      }
    }

    let fatigue = false;
    const lockedIn = this.lockedInConfig(move, params.moveEffect);
    if (lockedIn && outcome !== 'charged') {
      const current = attacker.volatileState.lockedInMove;
      if (current?.moveId !== move.id) {
        // 1 ターン目: 効いたら、残りのターン数を書く
        const remaining = this.rollLockedInTurns(lockedIn.turns) - 1;
        if (outcome === 'hit' && remaining > 0) {
          patch.lockedInMove = { moveId: move.id, turns: remaining };
          if (lockedIn.preventsSleep) {
            patch.uproar = true;
          }
        }
      } else {
        const remaining = current.turns - 1;
        const interrupted = outcome === 'failed' || (outcome === 'missed' && lockedIn.endsOnMiss);
        if (interrupted || remaining <= 0) {
          patch.lockedInMove = null;
          // 最後まで出したさわぐは、このターンの終わりまで uproar を残す（tickVolatileStateAtTurnEnd が消す）
          if (interrupted) {
            patch.uproar = null;
          }
          fatigue = !interrupted && lockedIn.confusesAtEnd === true;
        } else {
          patch.lockedInMove = { moveId: move.id, turns: remaining };
        }
      }
    }

    if (!isEmptyObject(patch)) {
      await this.battleRepository.patchVolatileState(attacker.id, patch);
      attacker = await this.refresh(attacker);
    }
    // さわぐが当たるたびに、場のねむっているポケモンを起こす（本家の uproar の onTryHit）
    const uproarMessage =
      lockedIn?.preventsSleep === true && outcome === 'hit'
        ? await this.wakeUpSleepers(attacker, params.battleContext)
        : null;
    if (!fatigue) {
      return uproarMessage;
    }
    const { inflicted } = await tryInflictStatus(
      attacker,
      StatusCondition.Confusion,
      params.battleContext,
      { source: { pokemon: attacker, kind: 'other', name: move.name } },
    );
    const fatigueMessage = inflicted ? 'became confused due to fatigue!' : null;
    return [uproarMessage, fatigueMessage].filter(Boolean).join(' ') || null;
  }

  /**
   * みらいよち・はめつのねがい（MoveBehaviors の futureMove）を、相手の陣営に置く
   * すでにその陣営に置かれていれば失敗する。当たるのは 2 ターン後のターン終了時（MoveExecutorService.executeFutureAttacks）
   * @returns 置いたら true
   */
  async scheduleFutureAttack(params: {
    battle: Battle;
    attacker: BattlePokemonStatus;
    defender: BattlePokemonStatus;
    move: Move;
  }): Promise<boolean> {
    const { battle, attacker, defender, move } = params;
    const latestBattle = (await this.battleRepository.findById(battle.id)) ?? battle;
    if (getSideConditions(latestBattle.sideState, defender.trainerId).futureAttack !== undefined) {
      return false;
    }
    await this.battleRepository.patchSideConditions(battle.id, defender.trainerId, {
      futureAttack: { turns: FUTURE_ATTACK_TURNS, moveId: move.id, sourceStatusId: attacker.id },
    });
    return true;
  }

  /**
   * さわぐが当たったときに、場のねむっているポケモンを起こす（ぼうおんの特性は起きない）
   * @returns メッセージ（起こしたポケモンがいなければ null）
   */
  private async wakeUpSleepers(
    user: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const statuses =
      (await this.battleRepository.findBattlePokemonStatusByBattleId(user.battleId)) ?? [];
    let woke = false;
    for (const status of statuses) {
      if (!status.isActive || status.statusCondition !== StatusCondition.Sleep) {
        continue;
      }
      if ((await resolveAbilityName(status, battleContext)) === SOUNDPROOF_ABILITY_NAME) {
        continue;
      }
      await this.battleRepository.updateBattlePokemonStatus(status.id, {
        statusCondition: StatusCondition.None,
      });
      woke = true;
    }
    return woke ? 'The uproar woke up the sleeping Pokemon!' : null;
  }

  /**
   * 技で相手を倒したときの、倒された側のみちづれ・おんねん
   * - みちづれ: 技の使用者もひんしになる
   * - おんねん: 技の使用者のその技の PP を 0 にする
   * みらいよち・はめつのねがいで倒したときは発動しない（本家と同じ）
   * @returns メッセージ
   */
  async applyFaintReactions(params: {
    attacker: BattlePokemonStatus;
    fainted: BattlePokemonStatus;
    move: Move;
    battleContext: BattleContext;
  }): Promise<string[]> {
    const { fainted, move } = params;
    if (
      !fainted.isFainted() ||
      fainted.id === params.attacker.id ||
      MoveBehaviors.has(move.name, 'futureMove')
    ) {
      return [];
    }
    const messages: string[] = [];
    let attacker = await this.refresh(params.attacker);
    if (fainted.volatileState.grudge === true && !attacker.isFainted()) {
      const reduced = await reducePp(
        attacker,
        move.id,
        Number.MAX_SAFE_INTEGER,
        params.battleContext,
      );
      if (reduced > 0) {
        messages.push(`${move.name} lost all its PP due to the grudge!`);
      }
      attacker = await this.refresh(attacker);
    }
    if (fainted.volatileState.destinyBond === true && !attacker.isFainted()) {
      await this.battleRepository.updateBattlePokemonStatus(attacker.id, { currentHp: 0 });
      messages.push('took its attacker down with it!');
    }
    return messages;
  }

  /**
   * 出し続ける技の設定（技の lockedIn、なければあばれる系の既定）
   */
  private lockedInConfig(
    move: Move,
    moveEffect: IMoveEffect | undefined,
  ): LockedInMoveConfig | undefined {
    if (moveEffect?.lockedIn) {
      return moveEffect.lockedIn;
    }
    return MoveBehaviors.has(move.name, 'lockedMove') ? RAMPAGE_LOCKED_IN : undefined;
  }

  private rollLockedInTurns(turns: LockedInMoveConfig['turns']): number {
    if (typeof turns === 'number') {
      return turns;
    }
    const [min, max] = turns;
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  private async refresh(pokemon: BattlePokemonStatus): Promise<BattlePokemonStatus> {
    return (await this.battleRepository.findBattlePokemonStatusById(pokemon.id)) ?? pokemon;
  }
}
