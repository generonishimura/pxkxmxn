import { BaseNormalMoveTypeChangeEffect } from '../base/base-normal-move-type-change-effect';

/**
 * エレキスキン（Galvanize）特性の効果
 * ノーマル技をでんき技にし、威力を 1.2 倍にする（BaseNormalMoveTypeChangeEffect）
 */
export class GalvanizeEffect extends BaseNormalMoveTypeChangeEffect {
  protected readonly changedTypeName = 'でんき';
}
