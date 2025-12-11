import { BaseMultiHitEffect } from './base-multi-hit-effect';

/**
 * 「つつく」の特殊効果実装
 *
 * 効果: 2-5回連続攻撃 (2-5 hits)
 * 注意: 実際のゲームでは「つつく」は1回攻撃の技です。
 *       本実装は Issue #48 の例示のために一時的に2-5回攻撃に設定しています。
 *       将来的には本来の仕様（1回攻撃）に戻す必要があります。
 */
export class PeckEffect extends BaseMultiHitEffect {
  protected readonly minHits = 2;
  protected readonly maxHits = 5;
}
