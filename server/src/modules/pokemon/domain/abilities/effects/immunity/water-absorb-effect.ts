import { BaseTypeAbsorbEffect } from '../base/base-type-absorb-effect';

/**
 * ちょすい（Water Absorb）特性の効果
 * みずタイプの技を無効化し、最大HPの1/4回復
 */
export class WaterAbsorbEffect extends BaseTypeAbsorbEffect {
  protected readonly immuneTypes = ['みず'] as const;
  protected readonly healRatio = 0.25; // 最大HPの1/4
}

