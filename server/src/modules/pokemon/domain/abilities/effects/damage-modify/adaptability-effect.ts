import { BaseTypeBoostEffect } from '../base/base-type-boost-effect';

/**
 * てきおうりょく（Adaptability）特性の効果
 * タイプ一致時の威力上昇（通常1.5倍→2.0倍）
 *
 * 通常のSTAB（Same Type Attack Bonus）は1.5倍だが、
 * てきおうりょくを持つポケモンは2.0倍になる
 */
export class AdaptabilityEffect extends BaseTypeBoostEffect {
  /**
   * ダメージ倍率
   * STABの1.5倍を2.0倍に変更するため、2.0 / 1.5 = 1.333...倍を適用
   */
  protected readonly damageMultiplier = 2.0 / 1.5;
}

