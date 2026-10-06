import { BaseHealEffect, HealFraction, HealTarget } from './base/base-heal-effect';
import { modifyByFraction } from './base/modify-by-fraction';

/**
 * ジャングルヒール（Jungle Healing）技の効果
 *
 * 効果: 自分の HP を最大 HP の 1/4 回復し、状態異常（やけど・こおり・まひ・どく・もうどく・ねむり）を治す
 *
 * - HP が満タンで状態異常もない場合は失敗
 *
 * 回復量は本家と同じく 4096 基準の補正値で計算する（端数がちょうど 0.5 のときは切り捨て）
 *
 * 注: 本家では味方も回復するが、シングルバトルのため自分のみを回復する
 */
export class JungleHealingEffect extends BaseHealEffect {
  protected readonly healTarget: HealTarget = 'self';
  protected readonly healFraction: HealFraction = { numerator: 1, denominator: 4 };
  protected readonly curesStatusCondition = true;

  protected computeHealAmount(maxHp: number): number {
    return modifyByFraction(maxHp, this.healFraction);
  }
}
