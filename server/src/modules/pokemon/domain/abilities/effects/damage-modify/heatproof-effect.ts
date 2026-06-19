import { BaseTypeDependentDamageEffect } from '../base/base-type-dependent-damage-effect';

/**
 * たいねつ（Heatproof）特性の効果
 * ほのおタイプの技のダメージを半減する
 *
 * 注: 本家ではやけど状態の毎ターンダメージも半減するが、状態異常ダメージは
 *     現状の engine では modifyDamage を経由しないため別処理として扱う
 */
export class HeatproofEffect extends BaseTypeDependentDamageEffect {
  protected readonly affectedTypes = ['ほのお'] as const;
  protected readonly damageMultiplier = 0.5;
}
