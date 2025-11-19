import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * タイプ依存のダメージ修正の基底クラス
 * 特定のタイプの技のダメージを修正する汎用的な実装
 *
 * 各特性は、このクラスを継承して無効化するタイプと倍率を設定するだけで実装できる
 */
export abstract class BaseTypeDependentDamageEffect implements IAbilityEffect {
  /**
   * ダメージを修正するタイプ名の配列（日本語名、例: ["ほのお", "こおり"]）
   */
  protected abstract readonly affectedTypes: readonly string[];

  /**
   * ダメージ倍率（1.0が通常、0.5が半減、1.5が1.5倍など）
   */
  protected abstract readonly damageMultiplier: number;

  /**
   * ダメージを受けるときに発動
   * 指定されたタイプの技の場合、ダメージを修正
   */
  modifyDamage(
    _pokemon: BattlePokemonStatus,
    damage: number,
    battleContext?: BattleContext,
  ): number {
    // 技のタイプ情報がない場合は修正しない
    if (!battleContext?.moveTypeName) {
      return damage;
    }

    // 指定されたタイプの技の場合はダメージを修正
    if (this.affectedTypes.includes(battleContext.moveTypeName)) {
      return Math.floor(damage * this.damageMultiplier);
    }

    // 指定されたタイプでない場合は修正しない
    return damage;
  }
}

