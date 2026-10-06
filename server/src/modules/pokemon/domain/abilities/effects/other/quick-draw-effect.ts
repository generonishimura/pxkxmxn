import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * クイックドロウ（Quick Draw）特性の効果
 *
 * 攻撃技（物理技・特殊技）を使うとき、30% の確率で同じ優先度の中で先に行動する。
 * 優先度が違う技には勝てない（エンジンは優先度が同じときだけ modifySpeed を呼ぶ）。
 *
 * - 変化技では発動しない
 * - 両方が発動したときは、もとの素早さで順番を決める（素早さに大きな値を足すため）
 *
 * 注: 発動したときのメッセージ（「クイックドロウで行動が早くなった」）は出ない。modifySpeed はメッセージを返せないため
 */
export class QuickDrawEffect implements IAbilityEffect {
  /**
   * 発動する確率
   */
  private static readonly ACTIVATION_CHANCE = 0.3;

  /**
   * 発動したときに素早さへ足す値（どんな素早さよりも大きい）
   */
  private static readonly SPEED_BONUS = 1_000_000;

  modifySpeed(
    _pokemon: BattlePokemonStatus,
    speed: number,
    battleContext?: BattleContext,
  ): number | undefined {
    const category = battleContext?.moveCategory;
    if (category !== 'Physical' && category !== 'Special') {
      return undefined;
    }
    if (Math.random() >= QuickDrawEffect.ACTIVATION_CHANCE) {
      return undefined;
    }
    return speed + QuickDrawEffect.SPEED_BONUS;
  }
}
