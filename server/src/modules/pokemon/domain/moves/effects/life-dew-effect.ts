import { BaseHealEffect, HealFraction, HealTarget } from './base/base-heal-effect';

/**
 * いのちのしずく（Life Dew）技の効果
 *
 * 効果: 自分の HP を最大 HP の 1/4 回復する
 *
 * - HP が満タンの場合は失敗
 *
 * 注: 本家では味方も回復するが、シングルバトルのため自分のみを回復する
 */
export class LifeDewEffect extends BaseHealEffect {
  protected readonly healTarget: HealTarget = 'self';
  protected readonly healFraction: HealFraction = { numerator: 1, denominator: 4 };
}
