import { IItemEffect } from '../item-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { eatItem, joinEatMessages } from '../../battle-events/eat-item';
import { applyHeal, fractionOfMaxHp, isHealBlocked } from '../../battle-events/heal';

/**
 * HP が半分以下になったら食べて HP を回復するきのみ（オレンのみ・オボンのみ）
 *
 * 本家と同じく onUpdate で、HP が最大 HP の半分以下なら食べる（技のヒットのあと・技以外のダメージのあと など）。
 * かいふくふうじ中は食べない（本家の onTryEatItem）
 *
 * 注: 相手のきんちょうかんで食べられなくなる効果は、きんちょうかんがまだないので見ていない
 */
export class HpRestoreBerryEffect implements IItemEffect {
  /**
   * @param healAmountOf 回復する量（持ち主から求める）
   */
  constructor(private readonly healAmountOf: (holder: BattlePokemonStatus) => number) {}

  async onUpdate(
    holder: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (holder.currentHp <= 0 || holder.currentHp > holder.maxHp / 2 || isHealBlocked(holder)) {
      return null;
    }
    return joinEatMessages(await eatItem(holder, battleContext));
  }

  async onEat(
    holder: BattlePokemonStatus,
    itemName: string,
    battleContext: BattleContext,
  ): Promise<string | null> {
    await applyHeal(holder, this.healAmountOf(holder), battleContext);
    return `${itemName} restored its HP!`;
  }
}

/**
 * オレンのみ（Oran Berry）: HP を 10 回復する
 */
export const createOranBerryEffect = (): HpRestoreBerryEffect => new HpRestoreBerryEffect(() => 10);

/**
 * オボンのみ（Sitrus Berry）: 最大 HP の 1/4 を回復する（切り捨て、最低 1）
 */
export const createSitrusBerryEffect = (): HpRestoreBerryEffect =>
  new HpRestoreBerryEffect(holder => fractionOfMaxHp(holder, 4));
