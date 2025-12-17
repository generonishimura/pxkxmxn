import { BaseWeatherMoveEffect } from './base/base-weather-move-effect';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';

/**
 * 「あられ」の特殊効果実装
 *
 * 効果: あられを降らせる
 */
export class HailMoveEffect extends BaseWeatherMoveEffect {
  protected readonly weather = Weather.Hail;
  protected readonly message = 'It started to hail!';
}

