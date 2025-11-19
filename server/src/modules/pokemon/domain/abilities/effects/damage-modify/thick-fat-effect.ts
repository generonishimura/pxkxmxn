import { BaseTypeDependentDamageEffect } from '../base/base-type-dependent-damage-effect';

/**
 * あついしぼう（Thick Fat）特性の効果
 * ほのおタイプとこおりタイプの技のダメージ半減
 */
export class ThickFatEffect extends BaseTypeDependentDamageEffect {
  protected readonly affectedTypes = ['ほのお', 'こおり'] as const;
  protected readonly damageMultiplier = 0.5;
}

