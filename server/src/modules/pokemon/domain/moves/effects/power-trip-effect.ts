import { BasePositiveRankPowerEffect } from './base/base-positive-rank-power-effect';

/**
 * つけあがる（Power Trip）技の効果
 *
 * 威力 = 20 + 20 × （自分の上がっているランクの合計）。上限はない。
 * 命中・回避のランクも数え、下がっているランクは数えない
 */
export class PowerTripEffect extends BasePositiveRankPowerEffect {
  protected readonly rankOwner = 'attacker';
  protected readonly basePower = 20;
  protected readonly powerPerRank = 20;
}
