import { BaseStatBoostEffect } from '../base/base-stat-boost-effect';

/**
 * ふとうのけん（Intrepid Sword）特性の効果
 * 場に出たとき、自分の攻撃ランクを 1 段階上げる
 *
 * 注: 第 9 世代では 1 回のバトルで 1 度しか発動しないが、バトル単位の発動済みフラグが無いため、
 *     場に出るたびに発動する（第 8 世代の挙動）
 */
export class IntrepidSwordEffect extends BaseStatBoostEffect {
  protected readonly statType = 'attack' as const;
  protected readonly rankChange = 1;
}
