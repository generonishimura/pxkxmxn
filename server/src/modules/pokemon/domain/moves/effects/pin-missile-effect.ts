import { BaseMultiHitEffect } from './base-multi-hit-effect';

/**
 * ミサイルばり（Pin Missile）技の効果
 *
 * 効果: 2-5回連続攻撃 (2-5 hits)
 */
export class PinMissileEffect extends BaseMultiHitEffect {
  protected readonly minHits = 2;
  protected readonly maxHits = 5;
}
