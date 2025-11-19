import { BaseTypeAbsorbEffect } from '../base/base-type-absorb-effect';

/**
 * ちくでん（Volt Absorb）特性の効果
 * でんきタイプの技を無効化し、最大HPの1/4回復
 */
export class VoltAbsorbEffect extends BaseTypeAbsorbEffect {
  protected readonly immuneTypes = ['でんき'] as const;
  protected readonly healRatio = 0.25; // 最大HPの1/4
}

