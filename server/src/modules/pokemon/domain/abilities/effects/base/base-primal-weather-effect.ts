import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { PrimalWeather } from '@/modules/battle/domain/state/side-state';
import { setPrimalWeather } from '../../../battle-events/field-state';

/**
 * ゲンシ天候を出す特性の基底クラス（はじまりのうみ・おわりのだいち・デルタストリーム）
 *
 * 場に出たとき setPrimalWeather でゲンシ天候を出す（ふつうの天候・別のゲンシ天候を上書きする）。
 * 持ち主が場を離れる（交代・ひんし）と、エンジンが天候を終わらせる。場に同じゲンシ天候の特性の
 * ポケモンが残っていれば、そのポケモンに引き継ぐ（primalWeather プロパティで判定する）
 */
export abstract class BasePrimalWeatherEffect implements IAbilityEffect {
  /**
   * 出すゲンシ天候
   */
  abstract readonly primalWeather: PrimalWeather;

  async onEntry(pokemon: BattlePokemonStatus, battleContext?: BattleContext): Promise<void> {
    if (!battleContext) {
      return;
    }
    await setPrimalWeather(battleContext, pokemon, this.primalWeather);
  }
}
