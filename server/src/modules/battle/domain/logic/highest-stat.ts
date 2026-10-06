import { BattlePokemonStatus } from '../entities/battle-pokemon-status.entity';
import { BattleStatValues } from '@/modules/pokemon/domain/abilities/battle-context.interface';

/**
 * HP以外の能力名
 */
export type NonHpStat = keyof BattleStatValues;

/**
 * 同じ値のときに優先する順番（攻撃 → 防御 → 特攻 → 特防 → 素早さ）
 */
const STAT_ORDER: readonly NonHpStat[] = [
  'attack',
  'defense',
  'specialAttack',
  'specialDefense',
  'speed',
];

/**
 * ランク補正込みで一番高い能力を返す（こだいかっせい、クォークチャージ）
 *
 * Pokemon Showdown の getBestStat(false, true) と同じく、ランク補正は掛けるが
 * 特性・道具などの補正は掛けない。同じ値の場合は STAT_ORDER で先の能力を返す。
 *
 * @param stats ランク補正前の実数値
 * @param status ランクを持つバトル中の状態
 */
export const getHighestStat = (stats: BattleStatValues, status: BattlePokemonStatus): NonHpStat => {
  let best: NonHpStat = STAT_ORDER[0];
  let bestValue = -1;
  for (const stat of STAT_ORDER) {
    const value = Math.floor(stats[stat] * status.getStatMultiplier(stat));
    if (value > bestValue) {
      best = stat;
      bestValue = value;
    }
  }
  return best;
};
