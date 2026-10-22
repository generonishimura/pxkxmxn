import { BaseSelfHealEffect, HealFraction } from './base/base-self-heal-effect';

/**
 * ミルクのみ（Milk Drink）技の効果
 *
 * 効果: 自分の HP を最大 HP の 1/2 回復する（HP が満タンのときは失敗）
 */
export class MilkDrinkEffect extends BaseSelfHealEffect {
  protected getHealFraction(): HealFraction {
    return { numerator: 1, denominator: 2 };
  }
}
