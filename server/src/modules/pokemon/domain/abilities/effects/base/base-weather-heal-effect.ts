import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';

/**
 * 天候依存の HP 回復特性の基底クラス
 *
 * 例: あめうけざら（雨で 1/16 回復）、アイスボディ（あられで 1/16 回復）
 *
 * 各派生クラスは対象天候のみを指定すれば良い
 */
export abstract class BaseWeatherHealEffect implements IAbilityEffect {
  /**
   * 回復が発動する天候
   */
  protected abstract readonly weather: Weather;

  /**
   * 回復率（既定は 1/16）
   */
  protected readonly healRatio: number = 1 / 16;

  async onTurnEnd(pokemon: BattlePokemonStatus, battleContext?: BattleContext): Promise<void> {
    if (!battleContext?.battleRepository) {
      return;
    }

    if (battleContext.battle.weather !== this.weather) {
      return;
    }

    // HP 満タンなら回復しない
    if (pokemon.currentHp >= pokemon.maxHp) {
      return;
    }

    const healAmount = Math.max(1, Math.floor(pokemon.maxHp * this.healRatio));
    const newHp = Math.min(pokemon.maxHp, pokemon.currentHp + healAmount);

    if (newHp === pokemon.currentHp) {
      return;
    }

    await battleContext.battleRepository.updateBattlePokemonStatus(pokemon.id, {
      currentHp: newHp,
    });
  }
}
