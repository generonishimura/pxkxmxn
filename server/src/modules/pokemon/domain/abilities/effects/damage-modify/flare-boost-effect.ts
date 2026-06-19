import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * ねつぼうそう（Flare Boost）特性の効果
 * やけど状態のとき、特殊技の威力を 1.5 倍にする
 *
 * 注: 本家挙動は「特攻ステータスが 1.5 倍」だが、ダメージ計算の最終段で同等の結果になるため
 *     modifyDamageDealt で実装する
 */
export class FlareBoostEffect implements IAbilityEffect {
  private static readonly DAMAGE_MULTIPLIER = 1.5;

  modifyDamageDealt(
    pokemon: BattlePokemonStatus,
    damage: number,
    battleContext?: BattleContext,
  ): number | undefined {
    if (pokemon.statusCondition !== StatusCondition.Burn) {
      return undefined;
    }

    if (battleContext?.moveCategory !== 'Special') {
      return undefined;
    }

    return Math.floor(damage * FlareBoostEffect.DAMAGE_MULTIPLIER);
  }
}
