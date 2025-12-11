import { BaseMultiHitEffect } from './base-multi-hit-effect';

/**
 * 「つつく」の特殊効果実装
 *
 * 効果: 2-5回連続攻撃 (2-5 hits)
 * 注意: 実際のゲームでは1回攻撃だが、Issue #48の例として2-5回に設定
 */
export class PeckEffect extends BaseMultiHitEffect {
  protected readonly minHits = 2;
  protected readonly maxHits = 5;
}
