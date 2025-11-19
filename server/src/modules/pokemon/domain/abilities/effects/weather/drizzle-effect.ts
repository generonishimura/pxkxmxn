import { BaseWeatherEffect } from '../base/base-weather-effect';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';

/**
 * あめふらし（Drizzle）特性の効果
 * 場に出すとき、雨を降らせる
 */
export class DrizzleEffect extends BaseWeatherEffect {
  protected readonly weather = Weather.Rain;
}

