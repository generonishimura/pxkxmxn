import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';

/**
 * 「みをけずる」の特殊効果実装
 *
 * 効果: 最大 HP の 1/2 を支払い、攻撃・特攻・素早さを 2 段階ずつ上昇させる
 *
 * - HP が不足する場合は失敗
 * - 攻撃/特攻/素早さが全て既に +6 の場合は失敗
 */
export class FilletAwayEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }

    const hpCost = Math.floor(attacker.maxHp / 2);
    if (attacker.currentHp <= hpCost) {
      return null;
    }

    const newAttackRank = Math.min(6, attacker.attackRank + 2);
    const newSpecialAttackRank = Math.min(6, attacker.specialAttackRank + 2);
    const newSpeedRank = Math.min(6, attacker.speedRank + 2);

    if (
      newAttackRank === attacker.attackRank &&
      newSpecialAttackRank === attacker.specialAttackRank &&
      newSpeedRank === attacker.speedRank
    ) {
      return null;
    }

    await battleContext.battleRepository.updateBattlePokemonStatus(attacker.id, {
      currentHp: attacker.currentHp - hpCost,
      attackRank: newAttackRank,
      specialAttackRank: newSpecialAttackRank,
      speedRank: newSpeedRank,
    });

    return 'user cut its HP and sharply raised Attack, Special Attack, and Speed!';
  }
}
