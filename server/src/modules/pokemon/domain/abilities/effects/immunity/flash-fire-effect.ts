import { BaseTypeAbsorbAndBoostEffect } from '../base/base-type-absorb-and-boost-effect';

/**
 * もらいび（Flash Fire）特性の効果
 * ほのおタイプの技を無効化し、ほのおタイプの技の威力1.5倍
 */
export class FlashFireEffect extends BaseTypeAbsorbAndBoostEffect {
  protected readonly immuneTypes = ['ほのお'] as const;
  protected readonly damageMultiplier = 1.5;
}

