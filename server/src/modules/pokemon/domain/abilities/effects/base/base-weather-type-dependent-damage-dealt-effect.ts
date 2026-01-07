import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';

/**
 * 天候依存かつタイプ依存のダメージ修正の基底クラス（攻撃側）
 * 特定の天候かつ特定のタイプの技のダメージを修正する汎用的な実装
 *
 * 各特性は、このクラスを継承して天候、タイプ、倍率を設定するだけで実装できる
 */
export abstract class BaseWeatherTypeDependentDamageDealtEffect implements IAbilityEffect {
  /**
   * 効果が発動する天候の配列
   */
  protected abstract readonly requiredWeathers: readonly Weather[];

  /**
   * ダメージを強化するタイプ名の配列（日本語名、例: ["いわ", "じめん"]）
   */
  protected abstract readonly affectedTypes: readonly string[];

  /**
   * ダメージ倍率（1.0が通常、1.3が1.3倍など）
   */
  protected abstract readonly damageMultiplier: number;

  /**
   * ダメージを与えるときに発動
   * 指定された天候かつ指定されたタイプの技の場合、ダメージを修正
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

    // 指定された天候でない場合は修正しない
    if (!this.requiredWeathers.includes(weather)) {
      return undefined;
    }

    // 技のタイプ情報がない場合は修正しない
    if (!battleContext.moveTypeName) {
      return undefined;
    }

    // 指定されたタイプの技の場合はダメージを修正
    if (this.affectedTypes.includes(battleContext.moveTypeName)) {
      return Math.floor(damage * this.damageMultiplier);
    }

    // 指定されたタイプでない場合は修正しない
    return undefined;
  }
}
