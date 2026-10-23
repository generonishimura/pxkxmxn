import { IItemEffect } from '../item-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';

/**
 * メトロノーム（Metronome。持ち物）
 * 同じ技を続けて成功させるたびに、その技のダメージが 1.2 倍ずつ上がる（最大 2 倍）
 * 本家の metronome の onModifyDamage（[4096, 4915, 5734, 6553, 7372, 8192] / 4096）
 *
 * 続けて成功させた回数は、エンジンが書く volatileState.consecutiveMoveCount（技の処理の中では、
 * この技を直前に続けて成功させた回数）を読む。別の技を出した・技が失敗した・交代したら 0 に戻る。
 * 別の技から呼ばれた技（ゆびをふるで出た技など）では上がらない（本家と同じ）
 */
export class MetronomeItemEffect implements IItemEffect {
  /**
   * 続けて成功させた回数ごとのダメージの補正（4096分率）
   */
  private static readonly DAMAGE_MODIFIERS: readonly number[] = [
    4096, 4915, 5734, 6553, 7372, 8192,
  ];

  modifyDamageDealt(
    holder: BattlePokemonStatus,
    damage: number,
    battleContext?: BattleContext,
  ): number | undefined {
    if (
      battleContext?.calledBy !== undefined ||
      battleContext?.moveId === undefined ||
      holder.volatileState.lastMoveId !== battleContext.moveId
    ) {
      return undefined;
    }
    const count = Math.min(
      holder.volatileState.consecutiveMoveCount ?? 0,
      MetronomeItemEffect.DAMAGE_MODIFIERS.length - 1,
    );
    if (count === 0) {
      return undefined;
    }
    return (damage * MetronomeItemEffect.DAMAGE_MODIFIERS[count]) / 4096;
  }
}
