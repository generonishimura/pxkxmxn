import { IItemEffect } from '../item-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { modifyByFixedPoint } from '@/modules/battle/domain/logic/fixed-point-modifier';

/**
 * 物理技か特殊技の威力を 1.1 倍にする持ち物
 * ちからのハチマキ（物理）、ものしりメガネ（特殊）。本家の onBasePower の chainModify([4505, 4096])
 */
export class CategoryBoostItemEffect implements IItemEffect {
  /**
   * 威力の補正（4096分率。1.1倍 = 4505）
   */
  private static readonly POWER_MODIFIER = 4505;

  /**
   * @param boostedCategory 威力を上げる技の分類
   */
  constructor(private readonly boostedCategory: 'Physical' | 'Special') {}

  modifyBasePower(
    _holder: BattlePokemonStatus,
    power: number,
    battleContext?: BattleContext,
  ): number | undefined {
    if (battleContext?.moveCategory !== this.boostedCategory) {
      return undefined;
    }
    return modifyByFixedPoint(power, CategoryBoostItemEffect.POWER_MODIFIER);
  }
}
