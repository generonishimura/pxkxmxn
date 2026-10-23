import { IItemEffect } from '../item-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { resolveMoveSlots } from '@/modules/battle/domain/logic/move-selection';
import { BattleContext } from '../../abilities/battle-context.interface';
import { eatItem, joinEatMessages } from '../../battle-events/eat-item';
import { restorePp } from '../../battle-events/pp';

/**
 * ヒメリのみ（Leppa Berry）
 * PP が 0 になった技があれば食べて、その技の PP を 10 回復する（最大 PP を超えない）
 *
 * 本家と同じく onUpdate で見る（技を出し終えたとき など）。PP が 0 の技が複数あれば、技の欄の先頭のものを回復する。
 * 食べたとき（はんすうで食べ直したときも）PP が 0 の技がなければ、PP が減っている先頭の技を回復する（本家の onEat）
 *
 * 注: 相手のきんちょうかんで食べられなくなる効果は、きんちょうかんがまだないので見ていない
 */
export class LeppaBerryEffect implements IItemEffect {
  private static readonly RESTORE_AMOUNT = 10;

  async onUpdate(
    holder: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository || holder.currentHp <= 0) {
      return null;
    }
    const slots = await this.moveSlotsOf(holder, battleContext);
    if (!slots.some(slot => slot.currentPp === 0)) {
      return null;
    }
    return joinEatMessages(await eatItem(holder, battleContext));
  }

  async onEat(
    holder: BattlePokemonStatus,
    itemName: string,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const slots = await this.moveSlotsOf(holder, battleContext);
    const target =
      slots.find(slot => slot.currentPp === 0) ?? slots.find(slot => slot.currentPp < slot.maxPp);
    if (!target) {
      return null;
    }
    await restorePp(holder, target.moveId, LeppaBerryEffect.RESTORE_AMOUNT, battleContext);
    return `${itemName} restored PP to its move!`;
  }

  private async moveSlotsOf(holder: BattlePokemonStatus, battleContext: BattleContext) {
    const moves =
      (await battleContext.battleRepository?.findBattlePokemonMovesByBattlePokemonStatusId(
        holder.id,
      )) ?? [];
    return resolveMoveSlots(moves, holder.volatileState);
  }
}
