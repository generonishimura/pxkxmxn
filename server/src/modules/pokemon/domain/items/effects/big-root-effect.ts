import { IItemEffect } from '../item-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { modifyByFixedPoint } from '@/modules/battle/domain/logic/fixed-point-modifier';

/**
 * おおきなねっこ（Big Root）
 * HP を吸い取る技・やどりぎのタネ・ちからをすいとる・ねをはる・アクアリングで回復する量が 1.3 倍（5324/4096）になる
 *
 * - 回復する量はエンジンが modifyDrainHeal で決める（applyDrainHeal と、ターン終了時のアクアリング・ねをはる）
 * - 相手がヘドロえきなら、回復のかわりに受けるダメージも 1.3 倍になる（本家と同じ）
 * 注: ギガドレインなどの吸収技は、まだ applyDrainHeal を使っていないので効かない（ゆめくい・ちからをすいとるには効く）
 */
export class BigRootEffect implements IItemEffect {
  /**
   * 回復の補正（4096分率。本家の chainModify([5324, 4096])）
   */
  private static readonly HEAL_MODIFIER = 5324;

  modifyDrainHeal(_holder: BattlePokemonStatus, amount: number): number {
    return modifyByFixedPoint(amount, BigRootEffect.HEAL_MODIFIER);
  }
}
