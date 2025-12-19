import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';

/**
 * 「ナインエボルブースト」の特殊効果実装
 *
 * 効果: 自分の全ステータスを2段階上昇
 */
export class ExtremeEvoboostEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }

    // 全てのステータスを2段階上昇
    const attackRank = Math.max(-6, Math.min(6, attacker.attackRank + 2));
    const defenseRank = Math.max(-6, Math.min(6, attacker.defenseRank + 2));
    const specialAttackRank = Math.max(-6, Math.min(6, attacker.specialAttackRank + 2));
    const specialDefenseRank = Math.max(-6, Math.min(6, attacker.specialDefenseRank + 2));
    const speedRank = Math.max(-6, Math.min(6, attacker.speedRank + 2));
    const accuracyRank = Math.max(-6, Math.min(6, attacker.accuracyRank + 2));
    const evasionRank = Math.max(-6, Math.min(6, attacker.evasionRank + 2));

    await battleContext.battleRepository.updateBattlePokemonStatus(attacker.id, {
      attackRank,
      defenseRank,
      specialAttackRank,
      specialDefenseRank,
      speedRank,
      accuracyRank,
      evasionRank,
    });

    return 'All stats sharply rose!';
  }
}

