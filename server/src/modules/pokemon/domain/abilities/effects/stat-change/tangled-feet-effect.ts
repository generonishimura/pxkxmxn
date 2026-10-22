import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { isConfused } from '@/modules/battle/domain/logic/volatile-status-condition';

/**
 * ちどりあし（Tangled Feet）特性の効果
 * こんらん状態（volatileState.confusionTurns がある）のとき、相手の技の命中率を半分にする
 *
 * `modifyEvasion` は 0-1 の値を返し、`accuracy-calculator.ts` で
 * `effectiveAccuracy * (1 - modifiedEvasion)` の形で適用される。
 *
 * 注: 命中判定は変化技では行われないため、効果はダメージ技に対してのみ発揮される。
 */
export class TangledFeetEffect implements IAbilityEffect {
  /**
   * こんらん時の回避補正値（0.5 = 相手の命中率 50%）
   */
  private static readonly CONFUSION_EVASION_BOOST = 0.5;

  modifyEvasion(
    pokemon: BattlePokemonStatus,
    _accuracy: number,
    _battleContext?: BattleContext,
  ): number | undefined {
    if (!isConfused(pokemon)) {
      return undefined;
    }
    return TangledFeetEffect.CONFUSION_EVASION_BOOST;
  }
}
