import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * さいせいりょく（Regenerator）特性の効果
 * 場から下がるとき、最大 HP の 1/3 を回復する
 */
export class RegeneratorEffect implements IAbilityEffect {
  private static readonly HEAL_RATIO = 1 / 3;

  async onSwitchOut(
    pokemon: BattlePokemonStatus,
    battleContext?: BattleContext,
  ): Promise<void> {
    if (!battleContext?.battleRepository) {
      return;
    }

    if (pokemon.currentHp >= pokemon.maxHp) {
      return;
    }

    const healAmount = Math.max(1, Math.floor(pokemon.maxHp * RegeneratorEffect.HEAL_RATIO));
    const newHp = Math.min(pokemon.maxHp, pokemon.currentHp + healAmount);

    if (newHp === pokemon.currentHp) {
      return;
    }

    await battleContext.battleRepository.updateBattlePokemonStatus(pokemon.id, {
      currentHp: newHp,
    });
  }
}
