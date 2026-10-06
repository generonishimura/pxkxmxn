import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { modifyByFixedPoint } from '@/modules/battle/domain/logic/fixed-point-modifier';

/**
 * きれあじ（Sharpness）特性の効果
 * 切る技の威力を1.5倍（6144/4096）にする
 *
 * 切る技の判定は技フラグ（slicing）で行う
 */
export class SharpnessEffect implements IAbilityEffect {
  /**
   * 切る技の威力の補正（4096分率で1.5倍）
   */
  private static readonly POWER_MODIFIER = 6144;

  /**
   * ダメージ計算式に入る前の威力に掛かる
   * 切る技の場合、威力を1.5倍にする
   */
  modifyBasePower(
    _pokemon: BattlePokemonStatus,
    power: number,
    battleContext?: BattleContext,
  ): number | undefined {
    if (battleContext?.moveFlags?.has('slicing') !== true) {
      return undefined;
    }
    return modifyByFixedPoint(power, SharpnessEffect.POWER_MODIFIER);
  }
}
