import { BaseFieldDependentSpeedEffect } from '../base/base-field-dependent-speed-effect';
import { Field } from '@/modules/battle/domain/entities/battle.entity';

/**
 * サーフテール（Surge Surfer）特性の効果
 * エレキフィールドの時、素早さ2倍
 */
export class SurgeSurferEffect extends BaseFieldDependentSpeedEffect {
  protected readonly requiredFields = [Field.ElectricTerrain] as const;
  protected readonly speedMultiplier = 2.0;
}
