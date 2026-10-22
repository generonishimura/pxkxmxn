import { IMoveEffect } from '../move-effect.interface';
import { StatType } from './base/base-stat-change-effect';

/**
 * なしくずし（Chip Away）技の効果
 *
 * 相手の防御・特防・回避のランクを無視して、ダメージ計算と命中判定をする。
 * 同じ効果を持つ せいなるつるぎ（Sacred Sword）・ＤＤラリアット（Darkest Lariat）にも、
 * このクラスのインスタンスを登録する。
 */
export class ChipAwayEffect implements IMoveEffect {
  readonly ignoredDefenderRanks: readonly StatType[] = ['defense', 'specialDefense', 'evasion'];
}
