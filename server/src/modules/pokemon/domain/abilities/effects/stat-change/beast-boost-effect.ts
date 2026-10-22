import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext, BattleStatValues } from '../../battle-context.interface';
import { applyStatChanges } from '../../../battle-events/stat-change';
import { joinStatChangeMessages } from '../../../moves/effects/base/base-stat-change-effect';

/**
 * 同じ実数値のときに優先する順番（攻撃 → 防御 → 特攻 → 特防 → 素早さ）
 */
const STAT_ORDER: readonly (keyof BattleStatValues)[] = [
  'attack',
  'defense',
  'specialAttack',
  'specialDefense',
  'speed',
];

/**
 * ビーストブースト（Beast Boost）特性の効果
 * 自分の技で相手をひんしにしたとき、実数値が最も高い能力を1段階上げる
 *
 * - 最も高い能力は、ランク補正前の実数値（ctx.attackerStats）で選ぶ（本家と同じ）
 * - 実数値が同じなら、攻撃・防御・特攻・特防・素早さの順で先の能力を上げる
 */
export class BeastBoostEffect implements IAbilityEffect {
  async onKnockOut(
    holder: BattlePokemonStatus,
    _fainted: BattlePokemonStatus,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    const stats = battleContext?.attackerStats;
    if (!battleContext || !stats) {
      return null;
    }

    const best = STAT_ORDER.reduce((current, stat) =>
      stats[stat] > stats[current] ? stat : current,
    );
    const result = await applyStatChanges(
      holder,
      [{ statType: best, rankChange: 1 }],
      battleContext,
      {
        source: { pokemon: holder, kind: 'ability', name: 'ビーストブースト' },
      },
    );
    return joinStatChangeMessages(result);
  }
}
