import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';

/**
 * 「ひっくりかえす」の特殊効果実装
 *
 * 効果: ターゲットのステータス変化を反転
 */
export class TopsyTurvyEffect implements IMoveEffect {
  async onUse(
    _attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }

    // 全てのステータスランクを反転（-6から+6の範囲内で）
    const attackRank = Math.max(-6, Math.min(6, -defender.attackRank));
    const defenseRank = Math.max(-6, Math.min(6, -defender.defenseRank));
    const specialAttackRank = Math.max(-6, Math.min(6, -defender.specialAttackRank));
    const specialDefenseRank = Math.max(-6, Math.min(6, -defender.specialDefenseRank));
    const speedRank = Math.max(-6, Math.min(6, -defender.speedRank));
    const accuracyRank = Math.max(-6, Math.min(6, -defender.accuracyRank));
    const evasionRank = Math.max(-6, Math.min(6, -defender.evasionRank));

    await battleContext.battleRepository.updateBattlePokemonStatus(defender.id, {
      attackRank,
      defenseRank,
      specialAttackRank,
      specialDefenseRank,
      speedRank,
      accuracyRank,
      evasionRank,
    });

    return 'The target\'s stat changes were inverted!';
  }
}

