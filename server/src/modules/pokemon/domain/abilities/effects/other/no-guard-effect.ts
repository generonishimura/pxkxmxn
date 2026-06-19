import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * ノーガード（No Guard）特性の効果
 * 自分の技は必ず命中する（命中率を 100 に上書き）
 *
 * 注: 本家挙動では「相手の技も自分に必ず命中する」も含まれるが、
 *     現状の engine には防御側から相手の命中率を上書きするフックが無い。
 *     攻撃側の挙動のみを実装する（accuracy-calculator.ts:84 経由）。
 */
export class NoGuardEffect implements IAbilityEffect {
  private static readonly FORCED_HIT_ACCURACY = 100;

  modifyAccuracy(
    _pokemon: BattlePokemonStatus,
    _accuracy: number,
    _battleContext?: BattleContext,
  ): number | undefined {
    return NoGuardEffect.FORCED_HIT_ACCURACY;
  }
}
