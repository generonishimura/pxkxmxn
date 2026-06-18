import { IMoveEffect } from '../../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../../abilities/battle-context.interface';
import { StatType, STAT_RANK_PROP_MAP, STAT_NAME_MAP } from './base-stat-change-effect';

/**
 * 自分の複数ステータスランクを変更する変化技の基底クラス
 *
 * 例: せいちょう（攻撃+1, 特攻+1）、ちょうのまい（特攻+1, 特防+1, 素早さ+1）
 *
 * - 各ステータス変化は独立して試行（一つが既に上限/下限でも他は変化する）
 * - 上昇/下降は statChanges 配列で個別に指定可能（からをやぶる等の混在型に対応）
 */
export abstract class BaseSelfMultiStatChangeMoveEffect implements IMoveEffect {
  /**
   * 変更するステータスとランク変化の組み合わせ
   */
  protected abstract readonly statChanges: ReadonlyArray<{ statType: StatType; rankChange: number }>;

  async onUse(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }

    const updateData: Partial<BattlePokemonStatus> = {};
    const messages: string[] = [];

    for (const { statType, rankChange } of this.statChanges) {
      const currentRank = attacker.getStatRank(statType);
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

    await battleContext.battleRepository.updateBattlePokemonStatus(attacker.id, updateData);
    return messages.join(' ');
  }
}
