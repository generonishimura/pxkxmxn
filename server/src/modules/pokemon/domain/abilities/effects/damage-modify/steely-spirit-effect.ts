import { BaseTypeDependentDamageDealtEffect } from '../base/base-type-dependent-damage-dealt-effect';

/**
 * はがねのせいしん（Steely Spirit）特性の効果
 * はがねタイプの技の威力1.5倍
 */
export class SteelySpiritEffect extends BaseTypeDependentDamageDealtEffect {
  protected readonly affectedTypes = ['はがね'] as const;
  protected readonly damageMultiplier = 1.5;
}
