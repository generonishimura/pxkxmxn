import { BaseConfuseWithStatBoostEffect } from './base/base-confuse-with-stat-boost-effect';
import { StatType } from './base/base-stat-change-effect';

/**
 * 「おだてる」の特殊効果実装
 *
 * 効果: 相手の特攻ランクを1段階上げ、こんらん状態にする
 */
export class FlatterEffect extends BaseConfuseWithStatBoostEffect {
  protected readonly statType: StatType = 'specialAttack';
  protected readonly rankChange = 1;
}
