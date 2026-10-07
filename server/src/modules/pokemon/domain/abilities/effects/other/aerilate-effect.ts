import { BaseNormalMoveTypeChangeEffect } from '../base/base-normal-move-type-change-effect';

/**
 * スカイスキン（Aerilate）特性の効果
 * ノーマル技をひこう技にし、威力を 1.2 倍にする（BaseNormalMoveTypeChangeEffect）
 *
 * 注: 行動順はもとの技のタイプで決めるので、はやてのつばさの優先度 +1 は、スカイスキンで変わったひこう技には付かない
 * （本家は付く）
 */
export class AerilateEffect extends BaseNormalMoveTypeChangeEffect {
  protected readonly changedTypeName = 'ひこう';
}
