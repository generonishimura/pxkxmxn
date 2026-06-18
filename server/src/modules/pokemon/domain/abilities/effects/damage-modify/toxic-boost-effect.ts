import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * どくぼうそう（Toxic Boost）特性の効果
 * 毒/猛毒状態のとき、物理技の威力を 1.5 倍にする
 *
 * 注: 本家挙動は「攻撃ステータスが 1.5 倍」だが、ダメージ計算の最終段で同等の結果になるため
 *     modifyDamageDealt で実装する
 */
export class ToxicBoostEffect implements IAbilityEffect {
  private static readonly DAMAGE_MULTIPLIER = 1.5;

  modifyDamageDealt(
    pokemon: BattlePokemonStatus,
    damage: number,
    battleContext?: BattleContext,
  ): number | undefined {
    if (
      pokemon.statusCondition !== StatusCondition.Poison &&
      pokemon.statusCondition !== StatusCondition.BadPoison
    ) {
      return undefined;
    }

    if (battleContext?.moveCategory !== 'Physical') {
      return undefined;
    }

    return Math.floor(damage * ToxicBoostEffect.DAMAGE_MULTIPLIER);
  }
}
