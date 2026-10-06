import { BaseHealEffect, HealFraction, HealTarget } from './base/base-heal-effect';

/**
 * みかづきのいのり（Lunar Blessing）技の効果
 *
 * 効果: 自分の HP を最大 HP の 1/4 回復し、状態異常（やけど・こおり・まひ・どく・もうどく・ねむり）を治す
 *
 * - HP が満タンで状態異常もない場合は失敗
 *
 * 注: 本家では味方も回復するが、シングルバトルのため自分のみを回復する
 */
export class LunarBlessingEffect extends BaseHealEffect {
  protected readonly healTarget: HealTarget = 'self';
  protected readonly healFraction: HealFraction = { numerator: 1, denominator: 4 };
  protected readonly curesStatusCondition = true;
}
