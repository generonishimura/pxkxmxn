import { BaseAddTypeMoveEffect } from './base/base-add-type-move-effect';

/**
 * ハロウィン（Trick-or-Treat）技の効果
 *
 * 相手に 3 つめのタイプとしてゴーストを足す。相手がすでにゴーストタイプなら失敗する。
 * もりののろいで足したくさタイプは、ゴーストに置き換わる。
 */
export class TrickOrTreatEffect extends BaseAddTypeMoveEffect {
  protected readonly typeName = 'ゴースト';
  protected readonly typeLabel = 'Ghost';
}
