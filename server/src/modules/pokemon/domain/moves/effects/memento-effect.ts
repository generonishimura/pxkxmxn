import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';

/**
 * 「おきみやげ」の特殊効果実装
 *
 * 効果: 相手の攻撃と特攻を 2 段階下げ、自分は HP0 で瀕死する
 *
 * 注: ひんし後の交代・処理（次のポケモン繰り出し等）はバトルフロー側の責務
 */
export class MementoEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }

    const newAttackRank = Math.max(-6, defender.attackRank - 2);
    const newSpecialAttackRank = Math.max(-6, defender.specialAttackRank - 2);

    const defenderUpdate: Partial<BattlePokemonStatus> = {};
    if (newAttackRank !== defender.attackRank) {
      (defenderUpdate as Record<string, number>).attackRank = newAttackRank;
    }
    if (newSpecialAttackRank !== defender.specialAttackRank) {
      (defenderUpdate as Record<string, number>).specialAttackRank = newSpecialAttackRank;
    }

    if (Object.keys(defenderUpdate).length > 0) {
      await battleContext.battleRepository.updateBattlePokemonStatus(defender.id, defenderUpdate);
    }

    // 自分は瀕死
    await battleContext.battleRepository.updateBattlePokemonStatus(attacker.id, {
      currentHp: 0,
    });

    return "target's Attack and Special Attack fell! User fainted!";
  }
}
