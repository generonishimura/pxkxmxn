import { BaseStatSplitEffect, SplitStat } from './base/base-stat-split-effect';

/**
 * パワーシェア（Power Split）技の効果
 * 自分と相手の攻撃・特攻の実数値を、それぞれ両者の平均（切り捨て）にする。交代するまで続く
 */
export class PowerSplitEffect extends BaseStatSplitEffect {
  protected readonly stats: readonly SplitStat[] = ['attack', 'specialAttack'];
  protected readonly message = 'shared its power with the target!';
}
