import { BaseStatDropImmunityEffect } from '../base/base-stat-drop-immunity-effect';

/**
 * するどいめ（Keen Eye）特性の効果
 * 命中率ランクが下がらない
 *
 * 注: 本家の「相手の回避率ランクを無視する」効果は、命中判定側に
 *     攻撃側特性のフックがないため未対応
 */
export class KeenEyeEffect extends BaseStatDropImmunityEffect {
  protected readonly protectedStat = 'accuracy' as const;
}
