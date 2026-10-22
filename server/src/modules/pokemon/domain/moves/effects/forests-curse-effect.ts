import { BaseAddTypeMoveEffect } from './base/base-add-type-move-effect';

/**
 * もりののろい（Forest's Curse）技の効果
 *
 * 相手に 3 つめのタイプとしてくさを足す。相手がすでにくさタイプなら失敗する。
 * ハロウィンで足したゴーストタイプは、くさに置き換わる。
 */
export class ForestsCurseEffect extends BaseAddTypeMoveEffect {
  protected readonly typeName = 'くさ';
  protected readonly typeLabel = 'Grass';
}
