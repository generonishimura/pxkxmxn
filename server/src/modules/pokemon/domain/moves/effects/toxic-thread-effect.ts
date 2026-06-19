import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「どくのいと」の特殊効果実装
 *
 * 効果: 相手にどくを付与し、すばやさランクを1段階下げる
 *       (Poisons the target and lowers its Speed by one stage)
 *
 * - どくタイプ・はがねタイプにはどく付与は無効
 * - すばやさランクは状態異常付与の成否にかかわらず常に下げを試みる
 */
export class ToxicThreadEffect implements IMoveEffect {
  private static readonly POISON_IMMUNE_TYPES = ['どく', 'はがね'] as const;

  async onUse(
    _attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }

    const messages: string[] = [];

    // どく付与の試行
    const canPoison =
      (!defender.statusCondition || defender.statusCondition === StatusCondition.None) &&
      !(await this.hasPoisonImmuneType(defender, battleContext));

    if (canPoison) {
      await battleContext.battleRepository.updateBattlePokemonStatus(defender.id, {
        statusCondition: StatusCondition.Poison,
      });
      messages.push('was poisoned!');
    }

    // すばやさランク -1 の試行
    const currentSpeedRank = defender.getStatRank('speed');
    const newSpeedRank = Math.max(-6, currentSpeedRank - 1);
    if (newSpeedRank !== currentSpeedRank) {
      await battleContext.battleRepository.updateBattlePokemonStatus(defender.id, {
        speedRank: newSpeedRank,
      });
      messages.push('Speed fell!');
    }

    return messages.length > 0 ? messages.join(' ') : null;
  }

  private async hasPoisonImmuneType(
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<boolean> {
    if (!battleContext.trainedPokemonRepository) {
      return false;
    }
    const trainedPokemon = await battleContext.trainedPokemonRepository.findById(
      defender.trainedPokemonId,
    );
    if (!trainedPokemon) {
      return false;
    }
    const primary = trainedPokemon.pokemon.primaryType.name;
    const secondary = trainedPokemon.pokemon.secondaryType?.name;
    return ToxicThreadEffect.POISON_IMMUNE_TYPES.some(t => t === primary || t === secondary);
  }
}
