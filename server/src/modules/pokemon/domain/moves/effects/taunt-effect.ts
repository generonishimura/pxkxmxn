import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { tryApplyVolatile } from '../../battle-events/volatile-infliction';
import { moveEffectSource } from './base/base-stat-change-effect';

/** 相手がまだ行動していないとき（このターンに交代で出てきたときも）のちょうはつのターン数 */
const TAUNT_TURNS = 3;

/**
 * ちょうはつ（Taunt）技の効果
 *
 * 相手を 3 ターンちょうはつ状態にし、変化技を出せなくする（tauntTurns）。
 * 本家と同じく、相手がこのターンにもう行動していれば 1 ターン長くする（使ったターンの終わりにも 1 減るため）。
 * このターンに交代で出てきた相手は、本家の activeTurns が 0 なので長くしない。
 * - すでにちょうはつされている相手には失敗する
 * - どんかん・アロマベールの相手には失敗する（かたやぶりで無視。tryApplyVolatile が判定する）
 * - 変化技を出せなくするのはエンジン（findMoveRestriction）
 */
export class TauntEffect implements IMoveEffect {
  shouldFail(
    _attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    _battleContext: BattleContext,
  ): boolean {
    return defender.volatileState.tauntTurns !== undefined;
  }

  async onUse(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const switchedInThisTurn = defender.volatileState.switchedInTurn === battleContext.battle.turn;
    const hasNotMovedYet = battleContext.defenderPendingMoveId !== undefined;
    const tauntTurns = hasNotMovedYet || switchedInThisTurn ? TAUNT_TURNS : TAUNT_TURNS + 1;
    const applied = await tryApplyVolatile(defender, 'taunt', { tauntTurns }, battleContext, {
      source: moveEffectSource(attacker, battleContext),
    });
    return applied ? 'fell for the taunt!' : 'but it failed';
  }
}
