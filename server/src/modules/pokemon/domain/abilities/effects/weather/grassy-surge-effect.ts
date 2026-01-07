import { BaseFieldEffect } from '../base/base-field-effect';
import { Field } from '@/modules/battle/domain/entities/battle.entity';

/**
 * グラスメイカー（Grassy Surge）特性の効果
 * 場に出すとき、グラスフィールドを展開する
 */
export class GrassySurgeEffect extends BaseFieldEffect {
  protected readonly field = Field.GrassyTerrain;
}
