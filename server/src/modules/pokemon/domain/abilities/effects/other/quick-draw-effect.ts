import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * クイックドロウ（Quick Draw）特性の効果
 *
 * 攻撃技（物理技・特殊技）を使うとき、30% の確率で同じ優先度の中で先に行動する。
 * 行動順の判定で、modifyFractionalPriority が優先度に 0.1 を足す（本家の onFractionalPriority）。
 *
 * - 1 未満の値なので、優先度が違う技には勝てない
 * - 素早さを変えないので、トリックルームの間も先に行動する（本家と同じ）
 * - 変化技では発動しない
 * - 両方が発動したときは、素早さで順番を決める
 *
 * 注: 発動したときのメッセージ（「クイックドロウで行動が早くなった」）は出ない。modifyFractionalPriority はメッセージを返せないため
 */
export class QuickDrawEffect implements IAbilityEffect {
  /**
   * 発動する確率
   */
  private static readonly ACTIVATION_CHANCE = 0.3;

  /**
   * 発動したときに優先度へ足す値
   */
  private static readonly FRACTIONAL_PRIORITY = 0.1;

  modifyFractionalPriority(
    _holder: BattlePokemonStatus,
    battleContext?: BattleContext,
  ): number | undefined {
    const category = battleContext?.moveCategory;
    if (category !== 'Physical' && category !== 'Special') {
      return undefined;
    }
    if (Math.random() >= QuickDrawEffect.ACTIVATION_CHANCE) {
      return undefined;
    }
    return QuickDrawEffect.FRACTIONAL_PRIORITY;
  }
}
