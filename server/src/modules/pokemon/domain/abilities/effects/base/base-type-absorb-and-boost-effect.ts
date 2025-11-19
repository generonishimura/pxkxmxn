import { BaseTypeImmunityEffect } from './base-type-immunity-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * タイプ吸収とダメージ強化の基底クラス
 * 特定のタイプの技を無効化し、そのタイプの技の威力を強化する汎用的な実装
 *
 * 各特性は、このクラスを継承して無効化するタイプと倍率を設定するだけで実装できる
 */
export abstract class BaseTypeAbsorbAndBoostEffect extends BaseTypeImmunityEffect {
  /**
   * ダメージ倍率（1.0が通常、1.5が1.5倍など）
   */
  protected abstract readonly damageMultiplier: number;

  /**
   * ダメージを与えるときに発動
   * 指定されたタイプの技の場合、ダメージを強化
   */
  modifyDamageDealt(
    _pokemon: BattlePokemonStatus,
    damage: number,
    battleContext?: BattleContext,
  ): number | undefined {
    // 技のタイプ情報がない場合は修正しない
    if (!battleContext?.moveTypeName) {
      return undefined;
    }

    // 指定されたタイプの技の場合はダメージを強化
    if (this.immuneTypes.includes(battleContext.moveTypeName)) {
      return Math.floor(damage * this.damageMultiplier);
    }

    // 指定されたタイプでない場合は修正しない
    return undefined;
  }
}

