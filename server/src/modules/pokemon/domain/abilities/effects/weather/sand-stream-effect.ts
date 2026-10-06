import { BaseWeatherEffect } from '../base/base-weather-effect';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';

/**
 * すなおこし（Sand Stream）特性の効果
 * 場に出すとき、砂嵐を起こす
 */
export class SandStreamEffect extends BaseWeatherEffect {
  protected readonly weather = Weather.Sandstorm;
}

