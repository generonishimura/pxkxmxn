import { BaseMultiHitEffect } from './base-multi-hit-effect';

/**
 * 必ず2回攻撃する技の効果（にどげり、ダブルアタック、ツインビーム など）
 *
 * 効果: 毎回2回連続で攻撃する
 *
 * 追加効果のない2回攻撃の技で、1つのインスタンスを複数の技名で共有する
 */
export class TwoHitEffect extends BaseMultiHitEffect {
  protected readonly minHits = 2;
  protected readonly maxHits = 2;
}
