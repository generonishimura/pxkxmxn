import { BaseWeatherEffect } from '../base/base-weather-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';

/**
 * ひひいろのこどう（Orichalcum Pulse）特性の効果
 * 場に出すとき晴れにする。晴れの間、攻撃が 5461/4096（約 1.33）倍になる
 *
 * 注: 攻撃ステータスではなく、物理技の与ダメージに 5461/4096 倍を掛けて近似する
 */
export class OrichalcumPulseEffect extends BaseWeatherEffect {
  private static readonly ATTACK_MULTIPLIER = 5461 / 4096;

  protected readonly weather = Weather.Sun;

  modifyDamageDealt(
    _pokemon: BattlePokemonStatus,
    damage: number,
    battleContext?: BattleContext,
  ): number | undefined {
    if (!battleContext) {
      return undefined;
    }

    // 天候を取得（battleContext.weatherが優先、なければbattle.weatherを使用）
    const weather = battleContext.weather ?? battleContext.battle?.weather ?? null;
    if (weather !== Weather.Sun || battleContext.moveCategory !== 'Physical') {
      return undefined;
    }

    return Math.floor(damage * OrichalcumPulseEffect.ATTACK_MULTIPLIER);
  }
}
