import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';

/**
 * 「みをけずる」の特殊効果実装
 *
 * 効果: 最大 HP の 1/2 を支払い、攻撃・特攻・素早さを 2 段階ずつ上昇させる
 *
 * - 現在 HP が最大 HP の 1/2 以下の場合は失敗（最大 HP が 1 なら、支払う HP を最低 1 にするので失敗）
 * - 攻撃/特攻/素早さが全て既に +6 の場合は失敗
 * - 失敗したときは 'But it failed' を返す（null はエンジンで成功として扱われるため）
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

    const hpCost = Math.max(1, Math.floor(attacker.maxHp / 2));
    if (attacker.currentHp <= hpCost) {
      return 'But it failed';
    }

    const newAttackRank = Math.min(6, attacker.attackRank + 2);
    const newSpecialAttackRank = Math.min(6, attacker.specialAttackRank + 2);
    const newSpeedRank = Math.min(6, attacker.speedRank + 2);

    if (
      newAttackRank === attacker.attackRank &&
      newSpecialAttackRank === attacker.specialAttackRank &&
      newSpeedRank === attacker.speedRank
    ) {
      return 'But it failed';
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
