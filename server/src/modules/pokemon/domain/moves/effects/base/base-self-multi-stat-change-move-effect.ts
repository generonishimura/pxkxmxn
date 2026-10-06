import { IMoveEffect } from '../../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../../abilities/battle-context.interface';
import { StatType, joinStatChangeMessages, moveEffectSource } from './base-stat-change-effect';
import { applyStatChanges } from '../../../battle-events/stat-change';

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
  protected abstract readonly statChanges: ReadonlyArray<{
    statType: StatType;
    rankChange: number;
  }>;

  async onUse(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }

    // 自分のランクを変える（自分の特性: たんじゅん・あまのじゃくなどが効く）
    const result = await applyStatChanges(attacker, this.statChanges, battleContext, {
      source: moveEffectSource(attacker, battleContext),
    });
    return joinStatChangeMessages(result);
  }
}
