import { BaseKnockOutStatBoostEffect } from '../base/base-knock-out-stat-boost-effect';

/**
 * じんばいったい（As One / ブリザポス）特性の効果
 * しろのいななきの効果を持つ: 自分の技で相手をひんしにしたとき、攻撃を1段階上げる
 *
 * 注: きんちょうかん（相手がきのみを食べられない）の部分は、持ち物の仕組みがないため実装していない
 * 注: PokeAPI の ja-Hrkt ではブリザポス用（as-one-glastrier）とレイスポス用（as-one-spectrier）が同じ名前で、
 * DB には先に登録されるブリザポス用だけが入る。そのためレイスポス用（くろのいななき・特攻+1）は扱わない
 */
export class AsOneGlastrierEffect extends BaseKnockOutStatBoostEffect {
  protected readonly statType = 'attack';
  protected readonly abilityName: string = 'じんばいったい';
}
