import { IAbilityEffect } from '../../ability-effect.interface';
import { BattleContext } from '../../battle-context.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { modifyByFixedPoint } from '@/modules/battle/domain/logic/fixed-point-modifier';

/**
 * アナライズ（Analytic）特性の効果
 * そのターンに最後に行動するとき（このあとに相手が技を出さないとき）、技の威力を1.3倍（5325/4096）にする
 *
 * 相手が先に交代したターンも、このあとに相手の技がないので発動する（本家と同じ）
 */
export class AnalyticEffect implements IAbilityEffect {
  /**
   * 威力の補正（4096分率で1.3倍）
   */
  private static readonly POWER_MODIFIER = 5325;

  /**
   * ダメージ計算式に入る前の威力に掛かる
   */
  modifyBasePower(
    _pokemon: BattlePokemonStatus,
    power: number,
    battleContext?: BattleContext,
  ): number | undefined {
    if (battleContext?.isLastToMove !== true) {
      return undefined;
    }
    return modifyByFixedPoint(power, AnalyticEffect.POWER_MODIFIER);
  }
}
