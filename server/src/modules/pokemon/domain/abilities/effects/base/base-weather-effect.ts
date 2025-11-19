import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';

/**
 * 天候変更の基底クラス
 * 場に出すときに天候を変更する汎用的な実装
 *
 * 各特性は、このクラスを継承して変更する天候を設定するだけで実装できる
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
    // バトルリポジトリがない場合は処理しない
    if (!battleContext?.battleRepository) {
      return;
    }

    const battle = battleContext.battle;

    // 既に同じ天候の場合は変更しない
    if (battle.weather === this.weather) {
      return;
    }

    // 天候を変更
    await battleContext.battleRepository.update(battle.id, {
      weather: this.weather,
    });
  }
}

