import { IMoveEffect } from '../../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../../abilities/battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { StatType, STAT_RANK_PROP_MAP, STAT_NAME_MAP } from './base-stat-change-effect';

/**
 * 「相手の能力を上げつつこんらんにする」変化技の基底クラス
 *
 * 例: いばる（攻撃 +2 + こんらん）、おだてる（特攻 +1 + こんらん）
 *
 * - 能力ランクとこんらん付与は独立して試行される
 *   片方が失敗してももう片方は実行される（本家挙動）
 * - こんらん付与は既に状態異常がある場合はスキップ（エンジン上 statusCondition が単一スロットのため）
 */
export abstract class BaseConfuseWithStatBoostEffect implements IMoveEffect {
  protected abstract readonly statType: StatType;
  protected abstract readonly rankChange: number;

  async onUse(
    _attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }

    const messages: string[] = [];

    // 能力ランク変更
    const currentRank = defender.getStatRank(this.statType);
    const newRank = Math.max(-6, Math.min(6, currentRank + this.rankChange));
    if (newRank !== currentRank) {
      const propName = STAT_RANK_PROP_MAP[this.statType];
      await battleContext.battleRepository.updateBattlePokemonStatus(defender.id, {
        [propName]: newRank,
      } as Partial<BattlePokemonStatus>);
      const statName = STAT_NAME_MAP[this.statType];
      const direction = this.rankChange > 0 ? 'rose' : 'fell';
      messages.push(`${statName} ${direction}!`);
    }

    // こんらん付与
    if (!defender.statusCondition || defender.statusCondition === StatusCondition.None) {
      await battleContext.battleRepository.updateBattlePokemonStatus(defender.id, {
        statusCondition: StatusCondition.Confusion,
      });
      messages.push('became confused!');
    }

    return messages.length > 0 ? messages.join(' ') : null;
  }
}
