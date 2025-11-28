import { BaseWeatherDependentSpeedEffect } from '../base/base-weather-dependent-speed-effect';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';

/**
 * すいすい（SwiftSwim）特性の効果
 * 雨の時、素早さ2倍 (Swift Swim - Doubles Speed in rain)
 */
export class SwiftSwimEffect extends BaseWeatherDependentSpeedEffect {
  protected readonly requiredWeathers = [Weather.Rain] as const;
  protected readonly speedMultiplier = 2.0;
}
