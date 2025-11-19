import { BaseWeatherDependentSpeedEffect } from '../base/base-weather-dependent-speed-effect';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';

/**
 * ようりょくそ（Chlorophyll）特性の効果
 * 晴れの時、素早さ2倍
 */
export class ChlorophyllEffect extends BaseWeatherDependentSpeedEffect {
  protected readonly requiredWeathers = [Weather.Sun] as const;
  protected readonly speedMultiplier = 2.0;
}

