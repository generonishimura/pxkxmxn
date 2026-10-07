import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { applyStatChanges } from '../../../battle-events/stat-change';
import { joinStatChangeMessages } from '../../../moves/effects/base/base-stat-change-effect';
import { getSideConditions } from '@/modules/battle/domain/state/side-state';

/**
 * かぜのり（Wind Rider）特性の効果
 * 相手の風技（攻撃技・変化技の両方）を無効にし、無効にしたとき攻撃を1段階上げる
 *
 * - 風技の判定は技フラグ（wind）で行う。無効にするのは相手を対象にする技だけ（エンジンが判定する）
 * - 技の無効化はかたやぶりで無視される（エンジンが防御側の isImmuneToMove を呼ばない）
 * - 攻撃ランクが+6で上がらないときは、技を無効にするだけで何も表示しない
 * - 自分の陣営においかぜ（tailwindTurns）が吹いている中で場に出たとき、攻撃を1段階上げる
 * - 自分の場においかぜが吹いたときの攻撃+1は、おいかぜが吹いたときに呼ばれる特性のフックがないため、
 *   おいかぜの技（TailwindEffect.onUse）が使い手の特性を見て行う
 * 注: 場に出たときの特性はメッセージを返せないため、場に出たときの攻撃+1は表示されない
 */
export class WindRiderEffect implements IAbilityEffect {
  /**
   * 自分の陣営においかぜが吹いている中で場に出たら、攻撃を1段階上げる
   */
  async onEntry(pokemon: BattlePokemonStatus, battleContext?: BattleContext): Promise<void> {
    const repository = battleContext?.battleRepository;
    if (!battleContext || !repository) {
      return;
    }
    const battle = (await repository.findById(battleContext.battle.id)) ?? battleContext.battle;
    if (getSideConditions(battle.sideState, pokemon.trainerId).tailwindTurns === undefined) {
      return;
    }
    await applyStatChanges(pokemon, [{ statType: 'attack', rankChange: 1 }], battleContext, {
      source: { pokemon, kind: 'ability', name: 'かぜのり' },
    });
  }

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
