import { BaseFieldEffect } from '../base/base-field-effect';
import { Field } from '@/modules/battle/domain/entities/battle.entity';

/**
 * ミストメイカー（Misty Surge）特性の効果
 * 場に出すとき、ミストフィールドを展開する
 */
export class MistySurgeEffect extends BaseFieldEffect {
  protected readonly field = Field.MistyTerrain;
}
