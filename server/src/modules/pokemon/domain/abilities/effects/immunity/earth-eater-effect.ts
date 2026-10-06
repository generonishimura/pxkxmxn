import { BaseTypeAbsorbEffect } from '../base/base-type-absorb-effect';

/**
 * どしょく（Earth Eater）特性の効果
 * じめんタイプの技を無効化し、最大 HP の 1/4 を回復する
 */
export class EarthEaterEffect extends BaseTypeAbsorbEffect {
  protected readonly immuneTypes = ['じめん'] as const;
  protected readonly healRatio = 0.25;
}
