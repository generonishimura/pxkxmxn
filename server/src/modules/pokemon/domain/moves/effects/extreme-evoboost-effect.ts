import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';

/**
 * 「ナインエボルブースト」の特殊効果実装
 *
 * 効果: 自分の全ステータスを2段階上昇
 */
export class ExtremeEvoboostEffect implements IMoveEffect {
  /**
   * ステータスランクの上昇量（段階）
   */
  private static readonly RANK_BOOST = 2;

  async onUse(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }

    // 全てのステータスを2段階上昇
    const attackRank = Math.max(
      -6,
      Math.min(6, attacker.attackRank + ExtremeEvoboostEffect.RANK_BOOST),
    );
    const defenseRank = Math.max(
      -6,
      Math.min(6, attacker.defenseRank + ExtremeEvoboostEffect.RANK_BOOST),
    );
    const specialAttackRank = Math.max(
      -6,
      Math.min(6, attacker.specialAttackRank + ExtremeEvoboostEffect.RANK_BOOST),
    );
    const specialDefenseRank = Math.max(
      -6,
      Math.min(6, attacker.specialDefenseRank + ExtremeEvoboostEffect.RANK_BOOST),
    );
    const speedRank = Math.max(
      -6,
      Math.min(6, attacker.speedRank + ExtremeEvoboostEffect.RANK_BOOST),
    );
    const accuracyRank = Math.max(
      -6,
      Math.min(6, attacker.accuracyRank + ExtremeEvoboostEffect.RANK_BOOST),
    );
    const evasionRank = Math.max(
      -6,
      Math.min(6, attacker.evasionRank + ExtremeEvoboostEffect.RANK_BOOST),
    );

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

