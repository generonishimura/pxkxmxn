import { BaseFieldEffect } from '../base/base-field-effect';
import { Field } from '@/modules/battle/domain/entities/battle.entity';

/**
 * サイコメイカー（Psychic Surge）特性の効果
 * 場に出すとき、サイコフィールドを展開する
 */
export class PsychicSurgeEffect extends BaseFieldEffect {
  protected readonly field = Field.PsychicTerrain;
}
