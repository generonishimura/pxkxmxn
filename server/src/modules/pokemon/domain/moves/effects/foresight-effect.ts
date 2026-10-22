import { BaseIdentifyEffect } from './base/base-identify-effect';

/**
 * みやぶる（Foresight）技の効果
 *
 * 相手に foresight を書く。相手が場にいる間、次のことが起きる（エンジンが判定する）。
 * - 相手の上がった回避ランクを 0 として扱う（下がった回避ランクはそのまま）
 * - ゴーストタイプの相手にノーマル・かくとう技が等倍で当たる
 *
 * 相手がすでに見破られているか、ミラクルアイを受けていれば失敗する（本家の onTryHit）。
 * かぎわけるも同じ状態を書く（本家でも同じ技として扱う）。
 */
export class ForesightEffect extends BaseIdentifyEffect {
  protected readonly kind = 'foresight';
}
