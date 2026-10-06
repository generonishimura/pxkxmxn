import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * ムラっけで変化する能力
 */
type MoodyStat = 'attack' | 'defense' | 'specialAttack' | 'specialDefense' | 'speed';

/**
 * ムラっけで更新するランクのプロパティ名
 */
type MoodyRankProp =
  | 'attackRank'
  | 'defenseRank'
  | 'specialAttackRank'
  | 'specialDefenseRank'
  | 'speedRank';

/**
 * 能力とランクのプロパティ名の対応
 */
const STAT_RANK_PROP: Record<MoodyStat, MoodyRankProp> = {
  attack: 'attackRank',
  defense: 'defenseRank',
  specialAttack: 'specialAttackRank',
  specialDefense: 'specialDefenseRank',
  speed: 'speedRank',
};

/**
 * ムラっけ（Moody）特性の効果
 * ターン終了時に、ランダムな能力ランクを2段階上げ、それとは別のランダムな能力ランクを1段階下げる
 *
 * 対象は攻撃・防御・特攻・特防・素早さ。+6 の能力は上げる候補から、-6 の能力は下げる候補から外す。
 *
 * 注: 第8世代以降のルール（命中率・回避率は対象外）に合わせている。
 */
export class MoodyEffect implements IAbilityEffect {
  private static readonly STATS: readonly MoodyStat[] = [
    'attack',
    'defense',
    'specialAttack',
    'specialDefense',
    'speed',
  ];

  private static readonly RAISE_AMOUNT = 2;
  private static readonly LOWER_AMOUNT = 1;
  private static readonly MAX_RANK = 6;
  private static readonly MIN_RANK = -6;

  /**
   * @param random 0 以上 1 未満の乱数を返す関数（テスト時に差し替え可能）
   */
  constructor(private readonly random: () => number = Math.random) {}

  async onTurnEnd(pokemon: BattlePokemonStatus, battleContext?: BattleContext): Promise<void> {
    if (!battleContext?.battleRepository) {
      return;
    }

    const updateData: Partial<Record<MoodyRankProp, number>> = {};

    const raiseCandidates = MoodyEffect.STATS.filter(
      stat => pokemon.getStatRank(stat) < MoodyEffect.MAX_RANK,
    );
    const raisedStat = this.pick(raiseCandidates);
    if (raisedStat) {
      updateData[STAT_RANK_PROP[raisedStat]] = Math.min(
        MoodyEffect.MAX_RANK,
        pokemon.getStatRank(raisedStat) + MoodyEffect.RAISE_AMOUNT,
      );
    }

    const lowerCandidates = MoodyEffect.STATS.filter(
      stat => stat !== raisedStat && pokemon.getStatRank(stat) > MoodyEffect.MIN_RANK,
    );
    const loweredStat = this.pick(lowerCandidates);
    if (loweredStat) {
      updateData[STAT_RANK_PROP[loweredStat]] = Math.max(
        MoodyEffect.MIN_RANK,
        pokemon.getStatRank(loweredStat) - MoodyEffect.LOWER_AMOUNT,
      );
    }

    if (!raisedStat && !loweredStat) {
      return;
    }

    await battleContext.battleRepository.updateBattlePokemonStatus(pokemon.id, updateData);
  }

  /**
   * 候補からランダムに1つ選ぶ（候補が空なら undefined）
   */
  private pick(candidates: readonly MoodyStat[]): MoodyStat | undefined {
    if (candidates.length === 0) {
      return undefined;
    }
    const index = Math.min(candidates.length - 1, Math.floor(this.random() * candidates.length));
    return candidates[index];
  }
}
