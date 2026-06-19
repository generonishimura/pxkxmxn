import { BaseSelfAllStatsBoostEffect } from './base/base-self-all-stats-boost-effect';

/**
 * 「あやしいかぜ」の特殊効果実装
 *
 * 効果: 10%の確率で自分の全能力ランクを1段階上昇
 */
export class OminousWindEffect extends BaseSelfAllStatsBoostEffect {
  protected readonly chance = 0.1;
}
