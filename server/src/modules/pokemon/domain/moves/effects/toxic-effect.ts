import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「どくどく」の特殊効果実装
 *
 * 効果: 必ず相手にもうどくを付与
 */
export class ToxicEffect implements IMoveEffect {
  /**
   * 技が命中したときに発動
   * 必ず相手にもうどくを付与
   */
  async onHit(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository || !battleContext.trainedPokemonRepository) {
      return null;
    }

    // 既に状態異常がある場合は付与しない
    if (defender.statusCondition && defender.statusCondition !== StatusCondition.None) {
      return null;
    }

    // どくタイプ・はがねタイプはもうどくにならない
    const trainedPokemon = await battleContext.trainedPokemonRepository.findById(
      defender.trainedPokemonId,
    );
    if (!trainedPokemon) {
      return null;
    }

    const isPoisonType =
      trainedPokemon.pokemon.primaryType.name === 'どく' ||
      trainedPokemon.pokemon.secondaryType?.name === 'どく';
    const isSteelType =
      trainedPokemon.pokemon.primaryType.name === 'はがね' ||
      trainedPokemon.pokemon.secondaryType?.name === 'はがね';
    if (isPoisonType || isSteelType) {
      return null;
    }

    // もうどくを付与
    await battleContext.battleRepository.updateBattlePokemonStatus(defender.id, {
      statusCondition: StatusCondition.BadPoison,
    });

    return `${defender.id} was badly poisoned!`;
  }
}

