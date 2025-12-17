import { BaseWeatherMoveEffect } from './base/base-weather-move-effect';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';

/**
 * 「すなあらし」の特殊効果実装
 *
 * 効果: 砂嵐を起こす
 */
export class SandstormMoveEffect extends BaseWeatherMoveEffect {
  protected readonly weather = Weather.Sandstorm;
  protected readonly message = 'A sandstorm kicked up!';
}

