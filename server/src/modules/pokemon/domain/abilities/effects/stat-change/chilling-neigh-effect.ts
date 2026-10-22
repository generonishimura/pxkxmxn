import { BaseKnockOutStatBoostEffect } from '../base/base-knock-out-stat-boost-effect';

/**
 * しろのいななき（Chilling Neigh）特性の効果
 * 自分の技で相手をひんしにしたとき、攻撃を1段階上げる
 */
export class ChillingNeighEffect extends BaseKnockOutStatBoostEffect {
  protected readonly statType = 'attack';
  protected readonly abilityName: string = 'しろのいななき';
}
