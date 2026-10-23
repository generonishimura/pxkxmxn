import { IItemEffect } from '../item-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { HitResult } from '../../battle-events/hit-result';
import { applyIndirectDamage } from '../../battle-events/indirect-damage';
import { fractionOfMaxHp } from '../../battle-events/heal';

/**
 * いのちのたま（Life Orb）
 * 攻撃技のダメージを 1.3 倍にする（本家の onModifyDamage の chainModify([5324, 4096])）。
 * 技を当てたあと、技全体で 1 回、最大 HP の 1/10（切り捨て、最低 1）を失う（マジックガードなら失わない）
 *
 * - ちからずくで追加効果が消えた技（battleContext.secondaryEffectsRemoved）では、HP を失わない（本家と同じ）
 * 注: 本家は、レッドカードなどで交代させられるとき（forceSwitchFlag）は HP を失わないが、ここでは区別しない
 */
export class LifeOrbEffect implements IItemEffect {
  /**
   * ダメージの補正（4096分率。1.3倍 = 5324）
   */
  private static readonly DAMAGE_MODIFIER = 5324;

  /**
   * 失う HP の割合（最大 HP の 1/10）
   */
  private static readonly RECOIL_DIVISOR = 10;

  modifyDamageDealt(_holder: BattlePokemonStatus, damage: number): number {
    return (damage * LifeOrbEffect.DAMAGE_MODIFIER) / 4096;
  }

  async onAfterMoveSecondarySelf(
    holder: BattlePokemonStatus,
    _target: BattlePokemonStatus,
    _hit: HitResult,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    if (!battleContext) {
      return null;
    }
    if (battleContext.secondaryEffectsRemoved === true) {
      return null;
    }
    const lost = await applyIndirectDamage(
      holder,
      fractionOfMaxHp(holder, LifeOrbEffect.RECOIL_DIVISOR),
      battleContext,
    );
    return lost > 0 ? 'It lost some of its HP due to Life Orb!' : null;
  }
}
