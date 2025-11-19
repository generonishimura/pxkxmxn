import { BaseWeatherDependentSpeedEffect } from '../base/base-weather-dependent-speed-effect';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';

/**
 * すいすい（Swift Swim）特性の効果
 * 雨の時、素早さ2倍
 */
export class SwiftSwimEffect extends BaseWeatherDependentSpeedEffect {
  protected readonly requiredWeathers = [Weather.Rain] as const;
  protected readonly speedMultiplier = 2.0;
}

