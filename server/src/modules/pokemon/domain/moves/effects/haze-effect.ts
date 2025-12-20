import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';

/**
 * 「くろいきり」の特殊効果実装
 *
 * 効果: 全てのポケモンのステータス、命中率、回避率をリセット
 */
export class HazeEffect implements IMoveEffect {
  async onUse(
    _attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }

    const battle = battleContext.battle;

    // バトル中の全てのポケモンのステータスを取得
    const allPokemon = await battleContext.battleRepository.findBattlePokemonStatusByBattleId(
      battle.id,
    );

    // 全てのポケモンのステータスランクを0にリセット
    for (const pokemon of allPokemon) {
      await battleContext.battleRepository.updateBattlePokemonStatus(pokemon.id, {
        attackRank: 0,
        defenseRank: 0,
        specialAttackRank: 0,
        specialDefenseRank: 0,
        speedRank: 0,
        accuracyRank: 0,
        evasionRank: 0,
      });
    }

    return 'All stat changes were eliminated!';
  }
}

