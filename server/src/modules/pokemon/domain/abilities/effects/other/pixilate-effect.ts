import { BaseNormalMoveTypeChangeEffect } from '../base/base-normal-move-type-change-effect';

/**
 * フェアリースキン（Pixilate）特性の効果
 * ノーマル技をフェアリー技にし、威力を 1.2 倍にする（BaseNormalMoveTypeChangeEffect）
 */
export class PixilateEffect extends BaseNormalMoveTypeChangeEffect {
  protected readonly changedTypeName = 'フェアリー';
}
