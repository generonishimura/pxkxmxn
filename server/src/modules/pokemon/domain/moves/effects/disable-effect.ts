import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { findMoveSlot, resolveMoveSlots } from '@/modules/battle/domain/logic/move-selection';
import { BattleContext } from '../../abilities/battle-context.interface';
import { tryApplyVolatile } from '../../battle-events/volatile-infliction';
import { moveEffectSource } from './base/base-stat-change-effect';

const STRUGGLE_MOVE_NAME = 'わるあがき';

/**
 * かなしばり（Disable）技の効果
 * 相手が最後に使った技（lastMoveId）を、しばらく出せなくする（disable）
 *
 * - 残りターン数は本家の duration 5 と同じ。相手がこのターンにまだ行動していなければ 1 減らして 4 にする
 * - 次のときは失敗する
 *   - 相手がまだ技を使っていない
 *   - 相手が最後に使った技がわるあがき
 *   - 相手が最後に使った技の PP が 0
 *   - すでにかなしばり状態（tryApplyVolatile が判定する。アロマベールで防がれるのも同じ）
 * - 相手が最後に使った技が技の欄にない（ものまねで欄が入れ替わったなど）ときは失敗しない。
 *   本家の disable の onStart も、PP が 0 の欄があるときだけ失敗し、欄がないときは止めない
 * - 技を出せなくするのと、残りターン数を減らすのはエンジンが行う
 */
export class DisableEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const battleRepository = battleContext.battleRepository;
    const moveId = defender.volatileState.lastMoveId;
    if (!battleRepository || moveId === undefined) {
      return 'But it failed';
    }

    const move = await battleContext.moveRepository?.findById(moveId);
    if (move?.name === STRUGGLE_MOVE_NAME) {
      return 'But it failed';
    }

    const slots = resolveMoveSlots(
      await battleRepository.findBattlePokemonMovesByBattlePokemonStatusId(defender.id),
      defender.volatileState,
    );
    if (findMoveSlot(slots, moveId)?.currentPp === 0) {
      return 'But it failed';
    }

    const turns = battleContext.defenderPendingMoveId !== undefined ? 4 : 5;
    const applied = await tryApplyVolatile(
      defender,
      'disable',
      { disable: { moveId, turns } },
      battleContext,
      { source: moveEffectSource(attacker, battleContext) },
    );
    return applied ? `disabled ${move?.name ?? 'the move'}!` : 'But it failed';
  }
}
