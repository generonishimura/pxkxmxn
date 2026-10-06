import { IMoveEffect } from '../../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../../abilities/battle-context.interface';
import { StatType, joinStatChangeMessages, moveEffectSource } from './base-stat-change-effect';
import { applyStatChanges } from '../../../battle-events/stat-change';

/**
 * 相手の複数ステータスランクを変更する変化技の基底クラス
 *
 * 例: くすぐる（攻撃-1, 防御-1）、おたけび（攻撃-1, 特攻-1）
 */
export abstract class BaseOpponentMultiStatChangeMoveEffect implements IMoveEffect {
  protected abstract readonly statChanges: ReadonlyArray<{
    statType: StatType;
    rankChange: number;
  }>;

  async onUse(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }

    // 相手のランクを変える（クリアボディなどの防御側の特性は applyStatChanges が判定する）
    const result = await applyStatChanges(defender, this.statChanges, battleContext, {
      source: moveEffectSource(attacker, battleContext),
    });
    return joinStatChangeMessages(result);
  }
}
