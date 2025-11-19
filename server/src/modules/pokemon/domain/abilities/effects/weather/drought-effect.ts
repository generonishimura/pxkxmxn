import { BaseWeatherEffect } from '../base/base-weather-effect';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';

/**
 * ひでり（Drought）特性の効果
 * 場に出すとき、晴れにする
 */
export class DroughtEffect extends BaseWeatherEffect {
  protected readonly weather = Weather.Sun;
}

