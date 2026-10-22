import { BaseTypeDependentDamageDealtEffect } from '../base/base-type-dependent-damage-dealt-effect';

/**
 * トランジスタ（Transistor）特性の効果
 * でんきタイプの技の威力1.3倍（第9世代の倍率）
 */
export class TransistorEffect extends BaseTypeDependentDamageDealtEffect {
  protected readonly affectedTypes = ['でんき'] as const;
  protected readonly damageMultiplier = 1.3;
}
