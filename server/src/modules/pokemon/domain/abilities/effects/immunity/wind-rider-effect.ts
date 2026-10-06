import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { applyStatChanges } from '../../../battle-events/stat-change';
import { joinStatChangeMessages } from '../../../moves/effects/base/base-stat-change-effect';

/**
 * かぜのり（Wind Rider）特性の効果
 * 相手の風技（攻撃技・変化技の両方）を無効にし、無効にしたとき攻撃を1段階上げる
 *
 * - 風技の判定は技フラグ（wind）で行う。無効にするのは相手を対象にする技だけ（エンジンが判定する）
 * - 技の無効化はかたやぶりで無視される（エンジンが防御側の isImmuneToMove を呼ばない）
 * - 攻撃ランクが+6で上がらないときは、技を無効にするだけで何も表示しない
 * 注: 本家の「自分の場においかぜが吹いたとき・おいかぜの中で場に出たときに攻撃+1」は、
 * おいかぜ（場の状態）がないため実装していない
 */
export class WindRiderEffect implements IAbilityEffect {
  /**
   * 相手の風技を無効にする
   */
  isImmuneToMove(_pokemon: BattlePokemonStatus, battleContext?: BattleContext): boolean {
    return battleContext?.moveFlags?.has('wind') === true;
  }

  /**
   * 風技を無効にしたあと、攻撃を1段階上げる（自分で起こした変化として扱う）
   */
  async onMoveBlocked(
    pokemon: BattlePokemonStatus,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    if (!battleContext) {
      return null;
    }
    const result = await applyStatChanges(
      pokemon,
      [{ statType: 'attack', rankChange: 1 }],
      battleContext,
      { source: { pokemon, kind: 'ability', name: 'かぜのり' } },
    );
    return joinStatChangeMessages(result);
  }
}
