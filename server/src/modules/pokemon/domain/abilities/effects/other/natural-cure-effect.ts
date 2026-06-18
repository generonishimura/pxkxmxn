import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * しぜんかいふく（Natural Cure）特性の効果
 * 場から下がるとき、自分の状態異常を治す
 */
export class NaturalCureEffect implements IAbilityEffect {
  async onSwitchOut(
    pokemon: BattlePokemonStatus,
    battleContext?: BattleContext,
  ): Promise<void> {
    if (!battleContext?.battleRepository) {
      return;
    }

    if (!pokemon.statusCondition || pokemon.statusCondition === StatusCondition.None) {
      return;
    }

    await battleContext.battleRepository.updateBattlePokemonStatus(pokemon.id, {
      statusCondition: StatusCondition.None,
    });
  }
}
