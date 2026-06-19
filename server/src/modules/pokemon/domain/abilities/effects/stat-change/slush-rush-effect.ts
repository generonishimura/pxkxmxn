import { BaseWeatherDependentSpeedEffect } from '../base/base-weather-dependent-speed-effect';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';

/**
 * ゆきがき（Slush Rush）特性の効果
 * あられの時、素早さ2倍
 */
export class SlushRushEffect extends BaseWeatherDependentSpeedEffect {
  protected readonly requiredWeathers = [Weather.Hail] as const;
  protected readonly speedMultiplier = 2.0;
}
