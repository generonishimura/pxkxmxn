import { BaseWeatherEffect } from '../base/base-weather-effect';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';

/**
 * ゆきふらし（Snow Warning）特性の効果
 * 場に出すとき、あられを降らせる
 */
export class SnowWarningEffect extends BaseWeatherEffect {
  protected readonly weather = Weather.Hail;
}

