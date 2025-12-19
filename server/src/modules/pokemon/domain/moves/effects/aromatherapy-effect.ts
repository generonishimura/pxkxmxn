import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「アロマセラピー」の特殊効果実装
 *
 * 効果: パーティ全体の状態異常を回復
 */
export class AromatherapyEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
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

    // 同じトレーナーのポケモンの状態異常を回復
    const partyPokemon = allPokemon.filter(p => p.trainerId === attacker.trainerId);

    for (const pokemon of partyPokemon) {
      if (pokemon.statusCondition && pokemon.statusCondition !== StatusCondition.None) {
        await battleContext.battleRepository.updateBattlePokemonStatus(pokemon.id, {
          statusCondition: StatusCondition.None,
        });
      }
    }

    return 'A soothing aroma wafted through the area! The party was healed of status conditions!';
  }
}

