import { BaseNormalMoveTypeChangeEffect } from '../base/base-normal-move-type-change-effect';

/**
 * ドラゴンスキン（Dragonize）特性の効果（メガオーダイル）
 * ノーマル技をドラゴン技にし、威力を 1.2 倍にする（BaseNormalMoveTypeChangeEffect）
 */
export class DragonizeEffect extends BaseNormalMoveTypeChangeEffect {
  protected readonly changedTypeName = 'ドラゴン';
}
