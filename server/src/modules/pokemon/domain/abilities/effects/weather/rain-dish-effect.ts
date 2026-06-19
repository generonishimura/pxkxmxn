import { BaseWeatherHealEffect } from '../base/base-weather-heal-effect';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';

/**
 * あめうけざら（Rain Dish）特性の効果
 * 雨の間、ターン終了時に最大 HP の 1/16 を回復する
 */
export class RainDishEffect extends BaseWeatherHealEffect {
  protected readonly weather = Weather.Rain;
}
