import { BaseMultiHitEffect } from './base-multi-hit-effect';

/**
 * 2〜5回連続で攻撃する技の効果（タネマシンガン、ロックブラスト、つららばり など）
 *
 * 効果: 2回:35% 3回:35% 4回:15% 5回:15% で攻撃回数が決まる（スキルリンクなら5回）
 *
 * 追加効果のない2〜5回攻撃の技で、1つのインスタンスを複数の技名で共有する
 */
export class TwoToFiveHitEffect extends BaseMultiHitEffect {
  protected readonly minHits = 2;
  protected readonly maxHits = 5;
}
