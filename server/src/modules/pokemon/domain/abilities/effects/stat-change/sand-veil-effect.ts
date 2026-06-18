import { BaseWeatherDependentEvasionEffect } from '../base/base-weather-dependent-evasion-effect';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';

/**
 * すながくれ（Sand Veil）特性の効果
 * すなあらしの間、回避率 +20%（相手の命中率を 80% に減少）
 */
export class SandVeilEffect extends BaseWeatherDependentEvasionEffect {
  protected readonly requiredWeather = Weather.Sandstorm;
}
