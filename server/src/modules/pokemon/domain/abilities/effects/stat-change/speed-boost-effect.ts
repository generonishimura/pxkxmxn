import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * かそく（Speed Boost）特性の効果
 * ターン終了時に素早さランクを1段階上昇させる
 */
export class SpeedBoostEffect implements IAbilityEffect {
  async onTurnEnd(
    pokemon: BattlePokemonStatus,
    battleContext?: BattleContext,
  ): Promise<void> {
    if (!battleContext?.battleRepository) {
      return;
    }

    const newSpeedRank = Math.min(6, pokemon.speedRank + 1);
    if (newSpeedRank === pokemon.speedRank) {
      return;
    }

    await battleContext.battleRepository.updateBattlePokemonStatus(pokemon.id, {
      speedRank: newSpeedRank,
    });
  }
}
