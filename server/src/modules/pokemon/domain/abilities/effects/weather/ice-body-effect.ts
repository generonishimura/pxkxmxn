import { BaseWeatherHealEffect } from '../base/base-weather-heal-effect';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';

/**
 * アイスボディ（Ice Body）特性の効果
 * あられの間、ターン終了時に最大 HP の 1/16 を回復する
 */
export class IceBodyEffect extends BaseWeatherHealEffect {
  protected readonly weather = Weather.Hail;
}
