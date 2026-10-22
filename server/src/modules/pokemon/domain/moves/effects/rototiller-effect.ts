import { BaseGrassTypeStatBoostEffect } from './base/base-grass-type-stat-boost-effect';
import { StatType } from './base/base-stat-change-effect';

/**
 * たがやす（Rototiller）技の効果
 *
 * 効果: 場にいるくさタイプのポケモン（自分・相手）の攻撃と特攻を1段階ずつ上げる
 *       どちらもくさタイプでない場合は失敗する
 *
 * 注: 「地面にいるポケモンだけ」という条件は考慮しない（ひこうタイプや特性ふゆうのくさタイプでも上がる）
 */
export class RototillerEffect extends BaseGrassTypeStatBoostEffect {
  protected readonly statChanges: ReadonlyArray<{ statType: StatType; rankChange: number }> = [
    { statType: 'attack', rankChange: 1 },
    { statType: 'specialAttack', rankChange: 1 },
  ];
}
