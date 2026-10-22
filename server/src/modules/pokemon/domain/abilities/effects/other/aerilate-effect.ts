import { BaseNormalMoveTypeChangeEffect } from '../base/base-normal-move-type-change-effect';

/**
 * スカイスキン（Aerilate）特性の効果
 * ノーマル技をひこう技にし、威力を 1.2 倍にする（BaseNormalMoveTypeChangeEffect）
 */
export class AerilateEffect extends BaseNormalMoveTypeChangeEffect {
  protected readonly changedTypeName = 'ひこう';
}
