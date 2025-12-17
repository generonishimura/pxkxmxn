import { BaseWeatherMoveEffect } from './base/base-weather-move-effect';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';

/**
 * 「にほんばれ」の特殊効果実装
 *
 * 効果: 晴れにする
 */
export class SunnyDayEffect extends BaseWeatherMoveEffect {
  protected readonly weather = Weather.Sun;
  protected readonly message = 'The sunlight turned harsh!';
}

