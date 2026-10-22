import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { modifyByFixedPoint } from '@/modules/battle/domain/logic/fixed-point-modifier';

/**
 * テクニシャン（Technician）特性の効果
 * 威力60以下の技の威力を1.5倍（6144/4096）にする
 *
 * 判定はヒットごとの威力（技の modifyMovePower・おやこあいの追加ヒットの補正のあと）で行う
 */
export class TechnicianEffect implements IAbilityEffect {
  /**
   * 効果が発動する威力の上限
   */
  private static readonly MAX_POWER_THRESHOLD = 60;

  /**
   * 威力の補正（4096分率で1.5倍）
   */
  private static readonly POWER_MODIFIER = 6144;

  /**
   * ダメージ計算式に入る前の威力に掛かる
   * 威力60以下の技の場合、威力を1.5倍にする
   */
  modifyBasePower(_pokemon: BattlePokemonStatus, power: number): number | undefined {
    if (power > TechnicianEffect.MAX_POWER_THRESHOLD) {
      return undefined;
    }
    return modifyByFixedPoint(power, TechnicianEffect.POWER_MODIFIER);
  }
}
