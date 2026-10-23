import { IItemEffect } from '../item-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';

/**
 * せんせいのツメ（Quick Claw）
 * 優先度 0 以下の技を出すとき、20% の確率で同じ優先度の中で先に行動する
 *
 * 行動順の判定（ActionOrderDeterminerService）で、modifyFractionalPriority が優先度に +0.1 を足す（本家の onFractionalPriority）。
 * 1 未満なので優先度の違いは越えず、素早さを変えないので、トリックルームの間も先に行動する。
 * - きんしのちからで変化技を出すときは発動しない（本家と同じ）
 * 注: 優先度は技の DB の値で判定する（いたずらごころなどで上がった優先度は見ない）
 * 注: 発動したときのメッセージは出ない。modifyFractionalPriority はメッセージを返せないため
 */
export class QuickClawEffect implements IItemEffect {
  /**
   * 発動する確率
   */
  private static readonly ACTIVATION_CHANCE = 0.2;

  /**
   * 発動したときに優先度へ足す値
   */
  private static readonly FRACTIONAL_PRIORITY = 0.1;

  modifyFractionalPriority(
    _holder: BattlePokemonStatus,
    battleContext?: BattleContext,
  ): number | undefined {
    if ((battleContext?.movePriority ?? 0) > 0) {
      return undefined;
    }
    if (
      battleContext?.moveCategory === 'Status' &&
      battleContext.attackerAbilityName === 'きんしのちから'
    ) {
      return undefined;
    }
    if (Math.random() >= QuickClawEffect.ACTIVATION_CHANCE) {
      return undefined;
    }
    return QuickClawEffect.FRACTIONAL_PRIORITY;
  }
}
