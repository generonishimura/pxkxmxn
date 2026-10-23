import { IItemEffect } from '../item-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { resolveMoveSlots } from '@/modules/battle/domain/logic/move-selection';
import { BattleContext } from '../../abilities/battle-context.interface';
import { consumeItem } from '../../battle-events/item-lookup';
import { restorePp } from '../../battle-events/pp';

/**
 * ヒメリのみ（Leppa Berry）
 * PP が 0 になった技があれば食べて、その技の PP を 10 回復する（最大 PP を超えない）
 *
 * 本家と同じく onUpdate で見る（技を出し終えたとき など）。PP が 0 の技が複数あれば、技の欄の先頭のものを回復する
 *
 * 注: 相手のきんちょうかんで食べられなくなる効果は、きんちょうかんがまだないので見ていない
 */
export class LeppaBerryEffect implements IItemEffect {
  private static readonly RESTORE_AMOUNT = 10;

  async onUpdate(
    holder: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const repository = battleContext.battleRepository;
    if (!repository || holder.currentHp <= 0) {
      return null;
    }
    const moves = (await repository.findBattlePokemonMovesByBattlePokemonStatusId(holder.id)) ?? [];
    const depleted = resolveMoveSlots(moves, holder.volatileState).find(
      slot => slot.currentPp === 0,
    );
    if (!depleted) {
      return null;
    }
    const itemName = await consumeItem(holder, battleContext);
    if (!itemName) {
      return null;
    }
    await restorePp(holder, depleted.moveId, LeppaBerryEffect.RESTORE_AMOUNT, battleContext);
    return `${itemName} restored PP to its move!`;
  }
}
