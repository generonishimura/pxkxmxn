import { IMoveEffect } from '../../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../../abilities/battle-context.interface';
import { rollSecondaryEffect } from '../../secondary-effect';
import { StatType, moveEffectSource } from './base-stat-change-effect';
import { applyStatChanges } from '../../../battle-events/stat-change';

/**
 * 「攻撃技 + 確率で自分の全能力ランクを1段階上昇」変化技の基底クラス
 *
 * 例: げんしのちから・ぎんいろのかぜ・あやしいかぜ
 *
 * - 上昇対象: 攻撃・防御・特攻・特防・素早さ（命中・回避は対象外、本家挙動）
 * - 確率は派生クラスで指定
 */
export abstract class BaseSelfAllStatsBoostEffect implements IMoveEffect {
  /**
   * 上げる能力（命中・回避は対象外）
   */
  private static readonly ALL_STATS: readonly StatType[] = [
    'attack',
    'defense',
    'specialAttack',
    'specialDefense',
    'speed',
  ];

  /**
   * ステータス上昇確率（0.0-1.0）
   */
  protected abstract readonly chance: number;

  async onHit(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }

    // 自分への追加効果なので、りんぷんでは止まらない
    if (!rollSecondaryEffect(this.chance, battleContext, 'self')) {
      return null;
    }

    // 自分の5つの能力を上げる（自分の特性: たんじゅん・あまのじゃくなどが効く）
    const result = await applyStatChanges(
      attacker,
      BaseSelfAllStatsBoostEffect.ALL_STATS.map(statType => ({ statType, rankChange: 1 })),
      battleContext,
      { source: moveEffectSource(attacker, battleContext) },
    );
    if (result.applied.length === 0) {
      return null;
    }
    // あまのじゃくで下がった場合は fell にする
    const direction = result.applied.every(change => change.rankChange < 0) ? 'fell' : 'rose';
    return [`user's stats ${direction}!`, ...result.messages].join(' ');
  }
}
