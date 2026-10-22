import { BaseHealEffect, HealFraction, HealTarget } from './base/base-heal-effect';

/**
 * いやしのはどう（Heal Pulse）技の効果
 *
 * 効果: 技の対象（シングルバトルでは相手）の HP を最大 HP の 1/2 回復する
 *
 * - 対象の HP が満タンの場合は失敗
 *
 * 注: 技に「波動」の分類情報がないため、メガランチャーによる回復量アップ（3/4）は考慮しない
 */
export class HealPulseEffect extends BaseHealEffect {
  protected readonly healTarget: HealTarget = 'target';
  protected readonly healFraction: HealFraction = { numerator: 1, denominator: 2 };
}
