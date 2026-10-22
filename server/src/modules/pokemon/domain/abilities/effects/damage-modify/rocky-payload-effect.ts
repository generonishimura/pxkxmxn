import { BaseTypeDependentDamageDealtEffect } from '../base/base-type-dependent-damage-dealt-effect';

/**
 * いわはこび（Rocky Payload）特性の効果
 * いわタイプの技の威力1.5倍
 */
export class RockyPayloadEffect extends BaseTypeDependentDamageDealtEffect {
  protected readonly affectedTypes = ['いわ'] as const;
  protected readonly damageMultiplier = 1.5;
}
