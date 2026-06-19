import { IMoveEffect } from '../../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../../abilities/battle-context.interface';
import { StatType, STAT_RANK_PROP_MAP, STAT_NAME_MAP } from './base-stat-change-effect';

/**
 * 相手の複数ステータスランクを変更する変化技の基底クラス
 *
 * 例: くすぐる（攻撃-1, 防御-1）、おたけび（攻撃-1, 特攻-1）
 */
export abstract class BaseOpponentMultiStatChangeMoveEffect implements IMoveEffect {
  protected abstract readonly statChanges: ReadonlyArray<{ statType: StatType; rankChange: number }>;

  async onUse(
    _attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }

    const updateData: Partial<BattlePokemonStatus> = {};
    const messages: string[] = [];

    for (const { statType, rankChange } of this.statChanges) {
      const currentRank = defender.getStatRank(statType);
      const newRank = Math.max(-6, Math.min(6, currentRank + rankChange));
      if (newRank === currentRank) {
        continue;
      }
      const propName = STAT_RANK_PROP_MAP[statType];
      (updateData as Record<string, number>)[propName] = newRank;
      const statName = STAT_NAME_MAP[statType];
      const direction = rankChange > 0 ? 'rose' : 'fell';
      messages.push(`${statName} ${direction}!`);
    }

    if (messages.length === 0) {
      return null;
    }

    await battleContext.battleRepository.updateBattlePokemonStatus(defender.id, updateData);
    return messages.join(' ');
  }
}
