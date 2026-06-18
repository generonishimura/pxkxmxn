import { BaseConfuseWithStatBoostEffect } from './base/base-confuse-with-stat-boost-effect';
import { StatType } from './base/base-stat-change-effect';

/**
 * 「いばる」の特殊効果実装
 *
 * 効果: 相手の攻撃ランクを2段階上げ、こんらん状態にする
 */
export class SwaggerEffect extends BaseConfuseWithStatBoostEffect {
  protected readonly statType: StatType = 'attack';
  protected readonly rankChange = 2;
}
