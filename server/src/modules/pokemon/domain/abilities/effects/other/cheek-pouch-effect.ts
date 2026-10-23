import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { IAbilityEffect } from '../../ability-effect.interface';
import { BattleContext } from '../../battle-context.interface';
import { applyHeal, fractionOfMaxHp } from '../../../battle-events/heal';

/**
 * ほおぶくろ（Cheek Pouch）特性の効果
 * きのみを食べると、きのみの効果に加えて最大 HP の 1/3（切り捨て、最低 1）を回復する（本家の onEatItem）
 *
 * - かいふくふうじ中は回復しない（applyHeal）
 * - 回復しなかった（HP が満タン）ときは、メッセージを出さない
 * - じゅくせいの 2 倍は掛からない（きのみの回復ではないため。本家と同じ）
 */
export class CheekPouchEffect implements IAbilityEffect {
  private static readonly HEAL_DIVISOR = 3;

  async onEatItem(
    holder: BattlePokemonStatus,
    _itemName: string,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const healed = await applyHeal(
      holder,
      fractionOfMaxHp(holder, CheekPouchEffect.HEAL_DIVISOR),
      battleContext,
    );
    return healed > 0 ? 'ほおぶくろ restored its HP!' : null;
  }
}
