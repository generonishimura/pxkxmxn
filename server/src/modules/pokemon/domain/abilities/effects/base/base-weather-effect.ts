import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';
import { setWeather } from '../../../battle-events/field-state';

/**
 * 天候変更の基底クラス
 * 場に出すときに天候を変更する汎用的な実装
 *
 * 各特性は、このクラスを継承して変更する天候を設定するだけで実装できる
 * setWeather で 5 ターンの残りターン数を書く。ゲンシ天候の間は何もしない
 */
export abstract class BaseWeatherEffect implements IAbilityEffect {
  /**
   * 変更する天候
   */
  protected abstract readonly weather: Weather;

  /**
   * 場に出すときに発動
   * 天候を変更
   */
  async onEntry(_pokemon: BattlePokemonStatus, battleContext?: BattleContext): Promise<void> {
    if (!battleContext) {
      return;
    }
    await setWeather(battleContext, this.weather);
  }
}
