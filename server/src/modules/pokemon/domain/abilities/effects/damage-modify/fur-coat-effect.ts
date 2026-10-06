import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * ファーコート（Fur Coat）特性の効果
 * 防御ステータスを 2 倍にする
 *
 * 注: ふしぎなうろこと同じく、ダメージ計算の最終段で
 *     物理ダメージを 1/2 倍に軽減することで同等の結果にする
 */
export class FurCoatEffect implements IAbilityEffect {
  private static readonly DEFENSE_BOOST = 2;

  modifyDamage(
    _pokemon: BattlePokemonStatus,
    damage: number,
    battleContext?: BattleContext,
  ): number {
    if (battleContext?.moveCategory !== 'Physical') {
      return damage;
    }
    return Math.floor(damage / FurCoatEffect.DEFENSE_BOOST);
  }
}
