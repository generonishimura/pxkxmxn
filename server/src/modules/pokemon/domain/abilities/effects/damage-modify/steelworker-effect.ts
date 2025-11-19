import { BaseTypeDependentDamageDealtEffect } from '../base/base-type-dependent-damage-dealt-effect';

/**
 * はがねつかい（Steelworker）特性の効果
 * はがねタイプの技の威力1.5倍
 */
export class SteelworkerEffect extends BaseTypeDependentDamageDealtEffect {
  protected readonly affectedTypes = ['はがね'] as const;
  protected readonly damageMultiplier = 1.5;
}

