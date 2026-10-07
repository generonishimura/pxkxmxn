import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { findMoveSlot, resolveMoveSlots } from '@/modules/battle/domain/logic/move-selection';
import { BattleContext } from '../../abilities/battle-context.interface';
import { tryApplyVolatile } from '../../battle-events/volatile-infliction';
import { MoveBehaviors } from '../move-behaviors';
import { moveEffectSource } from './base/base-stat-change-effect';

/** 相手がまだ行動していないときのアンコールのターン数（本家の duration） */
const ENCORE_TURNS = 3;

/**
 * アンコール（Encore）技の効果
 *
 * 相手が最後に出した技（lastMoveId）を、3 ターン出し続けさせる（encore）。
 * 本家と同じく、相手がこのターンにもう行動していれば 1 ターン長くする（使ったターンの終わりにも 1 減るため）。
 * 次のときは失敗する（本家の onStart）。
 * - 相手がまだ技を出していない・すでにアンコールされている
 * - 最後に出した技がアンコールできない技（MoveBehaviors の failEncore。わるあがき・へんしん・アンコールなど）
 * - 最後に出した技が技の欄にない、またはその PP が 0
 * - アロマベールの相手（かたやぶりで無視。tryApplyVolatile が判定する）
 *
 * 技を出させるのと、PP が尽きたら解くのはエンジン（planAction・MoveExecutorService）
 */
export class EncoreEffect implements IMoveEffect {
  shouldFail(
    _attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    _battleContext: BattleContext,
  ): boolean {
    const state = defender.volatileState;
    return state.lastMoveId === undefined || state.encore !== undefined;
  }

  async onUse(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const moveId = defender.volatileState.lastMoveId;
    if (moveId === undefined || !(await this.canEncore(defender, moveId, battleContext))) {
      return 'but it failed';
    }
    const turns =
      battleContext.defenderPendingMoveId !== undefined ? ENCORE_TURNS : ENCORE_TURNS + 1;
    const applied = await tryApplyVolatile(
      defender,
      'encore',
      { encore: { moveId, turns } },
      battleContext,
      { source: moveEffectSource(attacker, battleContext) },
    );
    return applied ? 'received an encore!' : 'but it failed';
  }

  /**
   * 最後に出した技をアンコールできるか（アンコールできない技でなく、技の欄にあって PP が残っている）
   */
  private async canEncore(
    defender: BattlePokemonStatus,
    moveId: number,
    battleContext: BattleContext,
  ): Promise<boolean> {
    const move = await battleContext.moveRepository?.findById(moveId);
    if (!move || MoveBehaviors.has(move.name, 'failEncore')) {
      return false;
    }
    const moves =
      (await battleContext.battleRepository?.findBattlePokemonMovesByBattlePokemonStatusId(
        defender.id,
      )) ?? [];
    const slot = findMoveSlot(resolveMoveSlots(moves, defender.volatileState), moveId);
    return slot !== undefined && slot.currentPp > 0;
  }
}
