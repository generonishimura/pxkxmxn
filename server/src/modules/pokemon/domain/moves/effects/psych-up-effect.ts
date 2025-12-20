import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';

/**
 * 「じこあんじ」の特殊効果実装
 *
 * 効果: 自分のステータス変化を捨てて、相手のステータス変化をコピー
 */
export class PsychUpEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }

    // 相手のステータスランクをコピー
    await battleContext.battleRepository.updateBattlePokemonStatus(attacker.id, {
      attackRank: defender.attackRank,
      defenseRank: defender.defenseRank,
      specialAttackRank: defender.specialAttackRank,
      specialDefenseRank: defender.specialDefenseRank,
      speedRank: defender.speedRank,
      accuracyRank: defender.accuracyRank,
      evasionRank: defender.evasionRank,
    });

    return 'The user copied the target\'s stat changes!';
  }
}

