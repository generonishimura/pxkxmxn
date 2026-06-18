import { BaseSelfStatChangeMoveEffect } from './base/base-self-stat-change-move-effect';
import { StatType } from './base/base-stat-change-effect';

/**
 * 「じゅうでん」の特殊効果実装
 *
 * 効果: 自分の特防ランクを1段階上げる
 *
 * 注: 「次ターンの電気技の威力が2倍になる」効果は、ターンをまたぐ永続フラグと
 *     技の威力を動的に修正する仕組み（power-modifier）の両方が必要なため、
 *     現状の engine には対応するフックがなく、別処理として保留する。
 */
export class ChargeEffect extends BaseSelfStatChangeMoveEffect {
  protected readonly statType: StatType = 'specialDefense';
  protected readonly rankChange = 1;
}
