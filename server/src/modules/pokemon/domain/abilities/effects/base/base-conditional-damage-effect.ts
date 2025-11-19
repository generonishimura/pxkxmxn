import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * ダメージ修正の条件タイプ
 */
export type DamageConditionType = 'hpFull' | 'hpHalf' | 'hpQuarter' | 'statusCondition' | 'custom';

/**
 * 条件付きダメージ修正の基底クラス
 * 特定の条件を満たす場合にダメージを修正する汎用的な実装
 *
 * 各特性は、このクラスを継承してパラメータを設定するだけで実装できる
 */
export abstract class BaseConditionalDamageEffect implements IAbilityEffect {
  /**
   * 条件タイプ
   */
  protected abstract readonly conditionType: DamageConditionType;

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
   * ダメージを受けるときに発動
   * 条件を満たす場合、ダメージを修正
   */
  modifyDamage(
    pokemon: BattlePokemonStatus,
    damage: number,
    battleContext?: BattleContext,
  ): number {
    // 条件を満たしているかチェック
    if (!this.checkCondition(pokemon, damage, battleContext)) {
      // 条件を満たしていない場合はダメージを変更しない
      return damage;
    }

    // ダメージを修正
    return Math.floor(damage * this.damageMultiplier);
  }
}

