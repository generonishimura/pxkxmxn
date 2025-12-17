import { BaseWeatherMoveEffect } from './base/base-weather-move-effect';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';

/**
 * 「あめをよぶ」の特殊効果実装
 *
 * 効果: 雨を降らせる
 */
export class RainDanceEffect extends BaseWeatherMoveEffect {
  protected readonly weather = Weather.Rain;
  protected readonly message = 'It started to rain!';
}

