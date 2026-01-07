import { BaseWeatherTypeDependentDamageDealtEffect } from '../base/base-weather-type-dependent-damage-dealt-effect';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';

/**
 * すなのちから（Sand Force）特性の効果
 * 砂嵐時、いわ・じめん・はがねタイプの技の威力1.3倍
 */
export class SandForceEffect extends BaseWeatherTypeDependentDamageDealtEffect {
  protected readonly requiredWeathers = [Weather.Sandstorm] as const;
  protected readonly affectedTypes = ['いわ', 'じめん', 'はがね'] as const;
  protected readonly damageMultiplier = 1.3;
}
