import { IMoveEffect } from '../../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../../abilities/battle-context.interface';

/**
 * 「攻撃技 + 確率で自分の全能力ランクを1段階上昇」変化技の基底クラス
 *
 * 例: げんしのちから・ぎんいろのかぜ・あやしいかぜ
 *
 * - 上昇対象: 攻撃・防御・特攻・特防・素早さ（命中・回避は対象外、本家挙動）
 * - 確率は派生クラスで指定
 */
export abstract class BaseSelfAllStatsBoostEffect implements IMoveEffect {
  /**
   * ステータス上昇確率（0.0-1.0）
   */
  protected abstract readonly chance: number;

  async onHit(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }

    if (this.chance < 1.0 && Math.random() >= this.chance) {
      return null;
    }

    const clampUp = (current: number): number => Math.max(-6, Math.min(6, current + 1));

    const newAttackRank = clampUp(attacker.attackRank);
    const newDefenseRank = clampUp(attacker.defenseRank);
    const newSpecialAttackRank = clampUp(attacker.specialAttackRank);
    const newSpecialDefenseRank = clampUp(attacker.specialDefenseRank);
    const newSpeedRank = clampUp(attacker.speedRank);

    // 全てが既に上限の場合は何も起こらない
    if (
      newAttackRank === attacker.attackRank &&
      newDefenseRank === attacker.defenseRank &&
      newSpecialAttackRank === attacker.specialAttackRank &&
      newSpecialDefenseRank === attacker.specialDefenseRank &&
      newSpeedRank === attacker.speedRank
    ) {
      return null;
    }

    await battleContext.battleRepository.updateBattlePokemonStatus(attacker.id, {
      attackRank: newAttackRank,
      defenseRank: newDefenseRank,
      specialAttackRank: newSpecialAttackRank,
      specialDefenseRank: newSpecialDefenseRank,
      speedRank: newSpeedRank,
    });

    return "user's stats rose!";
  }
}
