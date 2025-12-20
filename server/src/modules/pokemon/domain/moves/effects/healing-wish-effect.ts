import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「いやしのねがい」の特殊効果実装
 *
 * 効果: 自分がひんしになり、交代ポケモンのHPと状態異常を回復
 * 注意: 現時点では、交代ポケモンの特定が難しいため、パーティ全体の状態異常を回復する簡易実装
 */
export class HealingWishEffect implements IMoveEffect {
  /**
   * ひんし状態のHP値
   */
  private static readonly FAINTED_HP = 0;

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
      if (pokemon.id !== attacker.id) {
        // 交代ポケモンの状態異常を回復
        if (pokemon.statusCondition && pokemon.statusCondition !== StatusCondition.None) {
          await battleContext.battleRepository.updateBattlePokemonStatus(pokemon.id, {
            statusCondition: StatusCondition.None,
          });
        }
        // 交代ポケモンのHPを全回復
        if (pokemon.currentHp < pokemon.maxHp) {
          await battleContext.battleRepository.updateBattlePokemonStatus(pokemon.id, {
            currentHp: pokemon.maxHp,
          });
        }
      }
    }

    // 自分をひんしにする
    await battleContext.battleRepository.updateBattlePokemonStatus(attacker.id, {
      currentHp: HealingWishEffect.FAINTED_HP,
    });

    return 'The user fainted! Its replacement will be healed!';
  }
}
