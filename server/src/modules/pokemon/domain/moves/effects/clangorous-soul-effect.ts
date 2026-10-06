import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';

/**
 * ソウルビート（Clangorous Soul）技の効果
 *
 * 効果: 最大 HP の 33%（切り捨て、最低 1）を支払い、攻撃・防御・特攻・特防・素早さを 1 段階ずつ上げる
 *
 * - 現在 HP が最大 HP の 33% 以下、または最大 HP が 1 なら失敗
 * - 5 つの能力が全て既に +6 なら失敗
 */
export class ClangorousSoulEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }

    if (attacker.currentHp <= (attacker.maxHp * 33) / 100 || attacker.maxHp === 1) {
      return null;
    }
    const hpCost = Math.max(1, Math.floor((attacker.maxHp * 33) / 100));

    const clampUp = (current: number): number => Math.min(6, current + 1);

    const newAttackRank = clampUp(attacker.attackRank);
    const newDefenseRank = clampUp(attacker.defenseRank);
    const newSpecialAttackRank = clampUp(attacker.specialAttackRank);
    const newSpecialDefenseRank = clampUp(attacker.specialDefenseRank);
    const newSpeedRank = clampUp(attacker.speedRank);

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
      currentHp: attacker.currentHp - hpCost,
      attackRank: newAttackRank,
      defenseRank: newDefenseRank,
      specialAttackRank: newSpecialAttackRank,
      specialDefenseRank: newSpecialDefenseRank,
      speedRank: newSpeedRank,
    });

    return 'user cut its HP and raised all of its stats!';
  }
}
