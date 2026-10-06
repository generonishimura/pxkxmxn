import { BaseFieldEffect } from '../base/base-field-effect';
import { Field } from '@/modules/battle/domain/entities/battle.entity';

/**
 * エレキメイカー（Electric Surge）特性の効果
 * 場に出すとき、エレキフィールドを展開する
 *
 * 注: 他のメイカー系特性と同じく、フィールドの継続ターン数（5 ターン）は管理しない
 */
export class ElectricSurgeEffect extends BaseFieldEffect {
  protected readonly field = Field.ElectricTerrain;
}
