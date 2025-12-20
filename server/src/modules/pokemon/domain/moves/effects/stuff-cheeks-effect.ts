import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「ほおばる」の特殊効果実装（本プロジェクト独自仕様）
 *
 * 効果: ダメージを与えた後、同じトレーナーのポケモン（パーティ）全体の状態異常を回復する
 * 注意: ダメージ技として扱うため、afterDamageで処理する
 *
 * ※公式の『ほおばる』は「きのみを食べて自分の防御を2段階上げる」変化技ですが、
 *   本実装ではパーティ全体の状態異常回復というカスタム効果になっています。
 */
export class StuffCheeksEffect implements IMoveEffect {
  async afterDamage(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    _damage: number,
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

    return 'The party was healed of status conditions!';
  }
}

