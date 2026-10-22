import { BaseStatSplitEffect, SplitStat } from './base/base-stat-split-effect';

/**
 * ガードシェア（Guard Split）技の効果
 * 自分と相手の防御・特防の実数値を、それぞれ両者の平均（切り捨て）にする。交代するまで続く
 */
export class GuardSplitEffect extends BaseStatSplitEffect {
  protected readonly stats: readonly SplitStat[] = ['defense', 'specialDefense'];
  protected readonly message = 'shared its guard with the target!';
}
