import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';

/**
 * アシストパワーの基本威力と、上がったランク1つあたりの威力
 */
const BASE_POWER = 20;
const POWER_PER_BOOST = 20;

/**
 * アシストパワー（Stored Power）技の効果
 *
 * 効果: 威力 = 20 + 20 × 自分の上がっているランクの合計
 * 攻撃・防御・特攻・特防・素早さ・命中・回避のプラスのランクだけを数える（下がったランクは引かない）
 * 最大は全能力+6の860
 */
export class StoredPowerEffect implements IMoveEffect {
  modifyMovePower(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    _battleContext: BattleContext,
  ): number {
    const ranks = [
      attacker.attackRank,
      attacker.defenseRank,
      attacker.specialAttackRank,
      attacker.specialDefenseRank,
      attacker.speedRank,
      attacker.accuracyRank,
      attacker.evasionRank,
    ];
    const positiveBoosts = ranks.reduce((sum, rank) => sum + Math.max(0, rank), 0);
    return BASE_POWER + POWER_PER_BOOST * positiveBoosts;
  }
}
