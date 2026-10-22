import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { modifyByFixedPoint } from '@/modules/battle/domain/logic/fixed-point-modifier';

/**
 * すてみ（Reckless）特性の効果
 * 反動ダメージ、または外したときの自傷がある技の威力を1.2倍（4915/4096）にする
 *
 * 対象は技の hasRecoil（コンテキストの hasRecoil）。わるあがきは対象外（本家と同じ）
 */
export class RecklessEffect implements IAbilityEffect {
  /**
   * 威力の補正（4096分率で1.2倍）
   */
  private static readonly POWER_MODIFIER = 4915;

  /**
   * ダメージ計算式に入る前の威力に掛かる
   * 反動のある技の場合、威力を1.2倍にする
   */
  modifyBasePower(
    _pokemon: BattlePokemonStatus,
    power: number,
    battleContext?: BattleContext,
  ): number | undefined {
    if (battleContext?.hasRecoil !== true) {
      return undefined;
    }
    return modifyByFixedPoint(power, RecklessEffect.POWER_MODIFIER);
  }
}
