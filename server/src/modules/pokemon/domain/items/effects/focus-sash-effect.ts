import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { consumeItem } from '../../battle-events/item-lookup';
import { IItemEffect } from '../item-effect.interface';

/**
 * きあいのタスキ（Focus Sash）
 * HP が満タンのとき、ひんしになる技のダメージを HP 1 で耐え、タスキを使い切る
 *
 * - 連続技は、1 回目で HP が満タンでなくなるので、2 回目以降は耐えない（本家と同じ）
 * 注: こんらんの自傷・みらいよちは、エンジンがこのフックを呼ばないので耐えない（本家は耐える）
 */
export class FocusSashEffect implements IItemEffect {
  async endureHit(
    holder: BattlePokemonStatus,
    damage: number,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (holder.currentHp !== holder.maxHp || damage < holder.currentHp) {
      return null;
    }
    const itemName = await consumeItem(holder, battleContext);
    return itemName === undefined ? null : `hung on using its ${itemName}!`;
  }
}
