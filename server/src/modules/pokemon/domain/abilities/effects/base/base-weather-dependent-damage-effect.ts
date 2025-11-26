import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';

/**
 * 天候依存のダメージ修正の基底クラス
 * 特定の天候の時にダメージを修正する汎用的な実装
 *
 * 各特性は、このクラスを継承して天候と倍率を設定するだけで実装できる
 */
export abstract class BaseWeatherDependentDamageEffect implements IAbilityEffect {
  /**
   * 効果が発動する天候の配列
   */
  protected abstract readonly requiredWeathers: readonly Weather[];

  /**
   * ダメージ倍率（1.0が通常、0.5が半減、1.5が1.5倍など）
   */
  protected abstract readonly damageMultiplier: number;

  /**
   * ダメージを与えるときに発動
   * 指定された天候の時にダメージを修正
   */
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
    if (!weather) {
      return undefined;
    }

    // 指定された天候の場合はダメージを修正
    if (this.requiredWeathers.includes(weather)) {
      return Math.floor(damage * this.damageMultiplier);
    }

    // 指定された天候でない場合は修正しない
    return undefined;
  }
}

