import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * ふしぎなウロコ（Marvel Scale）特性の効果
 * 状態異常のとき、防御ステータスを 1.5 倍にする
 *
 * 注: 本家挙動は「防御ステータス 1.5 倍」だが、ダメージ計算の最終段で
 *     物理ダメージを 1/1.5 倍に軽減することで同等の結果になる
 */
export class MarvelScaleEffect implements IAbilityEffect {
  private static readonly DEFENSE_BOOST = 1.5;

  modifyDamage(
    pokemon: BattlePokemonStatus,
    damage: number,
    battleContext?: BattleContext,
  ): number {
    if (!pokemon.statusCondition || pokemon.statusCondition === StatusCondition.None) {
      return damage;
    }
    if (battleContext?.moveCategory !== 'Physical') {
      return damage;
    }
    return Math.floor(damage / MarvelScaleEffect.DEFENSE_BOOST);
  }
}
