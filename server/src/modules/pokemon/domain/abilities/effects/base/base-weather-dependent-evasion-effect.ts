import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';

/**
 * 天候依存の回避率ブースト特性の基底クラス
 *
 * 例:
 *  - すながくれ（Sand Veil）: すなあらしで回避率 +20%
 *  - ゆきがくれ（Snow Cloak）: あられで回避率 +20%
 *
 * `modifyEvasion` は 0-1 の値を返し、`accuracy-calculator.ts` で
 * `effectiveAccuracy * (1 - modifiedEvasion)` の形で適用される。
 * 0.2 を返すと相手の命中率を 80% に減らす効果。
 */
export abstract class BaseWeatherDependentEvasionEffect implements IAbilityEffect {
  /**
   * 効果が発動する天候
   */
  protected abstract readonly requiredWeather: Weather;

  /**
   * 回避補正値（0-1、既定 0.2 = 相手の命中率 80%）
   */
  protected readonly evasionBoost: number = 0.2;

  modifyEvasion(
    _pokemon: BattlePokemonStatus,
    _accuracy: number,
    battleContext?: BattleContext,
  ): number | undefined {
    if (!battleContext) {
      return undefined;
    }
    const weather = battleContext.weather ?? battleContext.battle?.weather ?? null;
    if (weather !== this.requiredWeather) {
      return undefined;
    }
    return this.evasionBoost;
  }
}
