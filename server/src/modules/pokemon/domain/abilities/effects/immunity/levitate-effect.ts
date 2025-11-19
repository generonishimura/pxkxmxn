import { BaseTypeImmunityEffect } from '../base/base-type-immunity-effect';

/**
 * ふゆう（Levitate）特性の効果
 * じめんタイプの技を無効化
 */
export class LevitateEffect extends BaseTypeImmunityEffect {
  protected readonly immuneTypes = ['じめん'] as const;
}

