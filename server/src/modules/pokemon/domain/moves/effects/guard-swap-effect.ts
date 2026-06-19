import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';

/**
 * 「ガードスワップ」の特殊効果実装
 *
 * 効果: ユーザーと相手の「防御」と「特防」のランク変化を交換する
 */
export class GuardSwapEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }

    const attackerDefense = attacker.defenseRank;
    const attackerSpecialDefense = attacker.specialDefenseRank;

    await battleContext.battleRepository.updateBattlePokemonStatus(defender.id, {
      defenseRank: attackerDefense,
      specialDefenseRank: attackerSpecialDefense,
    });
    await battleContext.battleRepository.updateBattlePokemonStatus(attacker.id, {
      defenseRank: defender.defenseRank,
      specialDefenseRank: defender.specialDefenseRank,
    });

    return 'The user swapped Defense and Special Defense changes with the target!';
  }
}
