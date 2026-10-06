import { BaseGrassTypeStatBoostEffect } from './base/base-grass-type-stat-boost-effect';
import { StatType } from './base/base-stat-change-effect';

/**
 * フラワーガード（Flower Shield）技の効果
 *
 * 効果: 場にいるくさタイプのポケモン（自分・相手）の防御を1段階上げる
 *       どちらもくさタイプでない場合は失敗する
 */
export class FlowerShieldEffect extends BaseGrassTypeStatBoostEffect {
  protected readonly statChanges: ReadonlyArray<{ statType: StatType; rankChange: number }> = [
    { statType: 'defense', rankChange: 1 },
  ];
}
