import { BaseWeatherMoveEffect } from './base/base-weather-move-effect';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';

/**
 * 「ゆきげしき」の特殊効果実装
 *
 * 効果: 天候を「あられ」にする（本家では「ゆき」だが engine の Weather enum に Snow が無いため Hail で代用）
 */
export class SnowscapeEffect extends BaseWeatherMoveEffect {
  protected readonly weather = Weather.Hail;
  protected readonly message = 'It started to snow!';
}
