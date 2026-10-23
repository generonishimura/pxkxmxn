import { FieldTurnsTarget, IItemEffect } from '../item-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';

/**
 * 持ち主が出した決まった天候を 8 ターン続ける持ち物の基底クラス（ふつうは 5 ターン）
 * あついいわ（はれ）・つめたいいわ（ゆき）・さらさらいわ（すなあらし）・しめったいわ（あめ）で使う
 *
 * 技（あまごいなど）でも特性（あめふらしなど）でも、setWeather に出したポケモンを渡したときに効く
 */
export abstract class BaseWeatherRockItemEffect implements IItemEffect {
  /**
   * 長くする天候
   */
  protected abstract readonly weather: Weather;

  private static readonly EXTENDED_TURNS = 8;

  modifyFieldTurns(_holder: BattlePokemonStatus, target: FieldTurnsTarget): number | undefined {
    return target.kind === 'weather' && target.weather === this.weather
      ? BaseWeatherRockItemEffect.EXTENDED_TURNS
      : undefined;
  }
}

/**
 * あついいわ（Heat Rock）: はれを 8 ターンにする
 */
export class HeatRockEffect extends BaseWeatherRockItemEffect {
  protected readonly weather = Weather.Sun;
}

/**
 * つめたいいわ（Icy Rock）: ゆきを 8 ターンにする
 * 注: エンジンの天候にゆきがないので、あられ（Weather.Hail）を長くする
 */
export class IcyRockEffect extends BaseWeatherRockItemEffect {
  protected readonly weather = Weather.Hail;
}

/**
 * さらさらいわ（Smooth Rock）: すなあらしを 8 ターンにする
 */
export class SmoothRockEffect extends BaseWeatherRockItemEffect {
  protected readonly weather = Weather.Sandstorm;
}

/**
 * しめったいわ（Damp Rock）: あめを 8 ターンにする
 */
export class DampRockEffect extends BaseWeatherRockItemEffect {
  protected readonly weather = Weather.Rain;
}
