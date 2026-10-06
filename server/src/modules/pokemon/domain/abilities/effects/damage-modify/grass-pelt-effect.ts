import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Field } from '@/modules/battle/domain/entities/battle.entity';

/**
 * くさのけがわ（Grass Pelt）特性の効果
 * グラスフィールドのとき、防御ステータスを 1.5 倍にする
 *
 * 注: 防御 1.5 倍は、ダメージ計算の最終段で物理ダメージを 1/1.5 倍に軽減することで近似する
 */
export class GrassPeltEffect implements IAbilityEffect {
  private static readonly DEFENSE_BOOST = 1.5;

  modifyDamage(
    _pokemon: BattlePokemonStatus,
    damage: number,
    battleContext?: BattleContext,
  ): number {
    if (!battleContext) {
      return damage;
    }

    // フィールドを取得（battleContext.field が優先、なければ battle.field を使用）
    const field = battleContext.field ?? battleContext.battle?.field ?? null;
    if (field !== Field.GrassyTerrain) {
      return damage;
    }
    if (battleContext.moveCategory !== 'Physical') {
      return damage;
    }
    return Math.floor(damage / GrassPeltEffect.DEFENSE_BOOST);
  }
}
