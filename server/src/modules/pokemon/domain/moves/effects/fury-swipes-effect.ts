import { BaseMultiHitEffect } from './base-multi-hit-effect';

/**
 * 「みだれひっかき」の特殊効果実装
 *
 * 効果: 2-5回連続攻撃 (2-5 hits)
 */
export class FurySwipesEffect extends BaseMultiHitEffect {
  protected readonly minHits = 2;
  protected readonly maxHits = 5;
}
