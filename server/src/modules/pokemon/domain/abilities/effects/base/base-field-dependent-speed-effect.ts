import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Field } from '@/modules/battle/domain/entities/battle.entity';

/**
 * フィールド依存の速度修正の基底クラス
 * 特定のフィールドの時に速度を修正する汎用的な実装
 *
 * 各特性は、このクラスを継承してフィールドと倍率を設定するだけで実装できる
 *
 * 例: サーフテール（エレキフィールドで素早さ2倍）
 */
export abstract class BaseFieldDependentSpeedEffect implements IAbilityEffect {
  /**
   * 効果が発動するフィールドの配列
   */
  protected abstract readonly requiredFields: readonly Field[];

  /**
   * 速度倍率（1.0が通常、2.0が2倍など）
   */
  protected abstract readonly speedMultiplier: number;

  modifySpeed(
    _pokemon: BattlePokemonStatus,
    speed: number,
    battleContext?: BattleContext,
  ): number | undefined {
    if (!battleContext) {
      return undefined;
    }

    // フィールドを取得（battleContext.field が優先、なければ battle.field を使用）
    const field = battleContext.field ?? battleContext.battle?.field ?? null;
    if (!field) {
      return undefined;
    }

    if (this.requiredFields.includes(field)) {
      return Math.floor(speed * this.speedMultiplier);
    }

    return undefined;
  }
}
