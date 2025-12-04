import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * 条件付きダメージ修正（与えるダメージ）の基底クラス
 * 特定の条件を満たす場合に与えるダメージを修正する汎用的な実装
 *
 * 各特性は、このクラスを継承してパラメータを設定するだけで実装できる
 */
export abstract class BaseConditionalDamageDealtEffect implements IAbilityEffect {
  /**
   * 条件タイプ
   */
  protected abstract readonly conditionType: 'hpFull' | 'hpHalf' | 'hpQuarter' | 'statusCondition' | 'custom';

  /**
   * ダメージ倍率（1.0が通常、0.5が半減、1.5が1.5倍など）
   */
  protected abstract readonly damageMultiplier: number;

  /**
   * カスタム条件チェック関数（conditionTypeが'custom'の場合に使用）
   */
  protected checkCustomCondition?(
    pokemon: BattlePokemonStatus,
    damage: number,
    battleContext?: BattleContext,
  ): boolean;

  /**
   * 条件を満たしているかチェック
   */
  protected checkCondition(
    pokemon: BattlePokemonStatus,
    damage: number,
    battleContext?: BattleContext,
  ): boolean {
    switch (this.conditionType) {
      case 'hpFull':
        // HPが満タンの場合
        return pokemon.currentHp >= pokemon.maxHp;
      case 'hpHalf':
        // HPが半分以下の場合
        return pokemon.currentHp <= pokemon.maxHp / 2;
      case 'hpQuarter':
        // HPが1/4以下の場合
        return pokemon.currentHp <= pokemon.maxHp / 4;
      case 'statusCondition':
        // 状態異常がある場合（None以外）
        return pokemon.statusCondition !== null && pokemon.statusCondition !== 'None';
      case 'custom':
        // カスタム条件チェック
        if (this.checkCustomCondition) {
          return this.checkCustomCondition(pokemon, damage, battleContext);
        }
        return false;
      default:
        return false;
    }
  }

  /**
   * ダメージを与えるときに発動
   * 条件を満たす場合、ダメージを修正
   */
  modifyDamageDealt(
    pokemon: BattlePokemonStatus,
    damage: number,
    battleContext?: BattleContext,
  ): number | undefined {
    // 条件を満たしているかチェック
    if (!this.checkCondition(pokemon, damage, battleContext)) {
      // 条件を満たしていない場合はダメージを変更しない（undefinedを返す）
      return undefined;
    }

    // ダメージを修正
    return Math.floor(damage * this.damageMultiplier);
  }
}


