import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { heldItemName } from '../../battle-events/item-lookup';
import { canGiveItem, giveItem, takeItem } from '../../battle-events/item-transfer';

/**
 * ギフトパス（Bestow）技の効果
 *
 * 使用者の持ち物を、持ち物を持っていない相手に渡す（takeItem → giveItem）。
 * - 相手が持ち物を持っている・使用者が持ち物を持っていない・使用者の持ち物を動かせない（その種族のメガストーン）なら失敗する
 * - 使用者が自分で手放すので、ねんちゃくでは止まらない
 * - みがわりを貫通し、まもるで防げない（MoveBehaviors の bypassSubstitute・noProtect）
 */
export class BestowEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }
    const itemName = heldItemName(attacker);
    if (itemName === undefined || !(await canGiveItem(defender, itemName, battleContext))) {
      return 'But it failed';
    }
    const taken = await takeItem(attacker, battleContext);
    if (taken === undefined) {
      return 'But it failed';
    }
    await giveItem(defender, taken, battleContext);
    return `The target received ${taken}!`;
  }
}
