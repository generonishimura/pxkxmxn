import { IItemEffect } from '../item-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';

/**
 * たつじんのおび（Expert Belt）
 * 効果抜群の技のダメージを 1.2 倍にする（本家の onModifyDamage の chainModify([4915, 4096])）
 */
export class ExpertBeltEffect implements IItemEffect {
  /**
   * ダメージの補正（4096分率。1.2倍 = 4915）
   */
  private static readonly DAMAGE_MODIFIER = 4915;

  modifyDamageDealt(
    _holder: BattlePokemonStatus,
    damage: number,
    battleContext?: BattleContext,
  ): number | undefined {
    if ((battleContext?.typeEffectiveness ?? 1) <= 1) {
      return undefined;
    }
    return (damage * ExpertBeltEffect.DAMAGE_MODIFIER) / 4096;
  }
}
