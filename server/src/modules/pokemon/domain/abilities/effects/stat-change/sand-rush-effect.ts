import { BaseWeatherDependentSpeedEffect } from '../base/base-weather-dependent-speed-effect';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';

/**
 * すなかき（Sand Rush）特性の効果
 * 砂嵐の時、素早さ2倍
 */
export class SandRushEffect extends BaseWeatherDependentSpeedEffect {
  protected readonly requiredWeathers = [Weather.Sandstorm] as const;
  protected readonly speedMultiplier = 2.0;
}

