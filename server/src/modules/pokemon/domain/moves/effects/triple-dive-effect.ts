import { BaseMultiHitEffect } from './base-multi-hit-effect';

/**
 * トリプルダイブ（Triple Dive）技の効果
 *
 * 効果: 毎回3回連続で攻撃する
 */
export class TripleDiveEffect extends BaseMultiHitEffect {
  protected readonly minHits = 3;
  protected readonly maxHits = 3;
}
