import { BaseKnockOutStatBoostEffect } from '../base/base-knock-out-stat-boost-effect';

/**
 * くろのいななき（Grim Neigh）特性の効果
 * 自分の技で相手をひんしにしたとき、特攻を1段階上げる
 */
export class GrimNeighEffect extends BaseKnockOutStatBoostEffect {
  protected readonly statType = 'specialAttack';
  protected readonly abilityName: string = 'くろのいななき';
}
