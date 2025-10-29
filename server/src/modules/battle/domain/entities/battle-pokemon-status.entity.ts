import { StatusCondition } from './status-condition.enum';

/**
 * BattlePokemonStatusエンティティ
 * バトル中のポケモン個別の状態を管理
 */
export class BattlePokemonStatus {
  constructor(
    public readonly id: number,
    public readonly battleId: number,
    public readonly trainedPokemonId: number,
    public readonly trainerId: number,
    public readonly isActive: boolean,
    public readonly currentHp: number,
    public readonly maxHp: number,
    public readonly attackRank: number,
    public readonly defenseRank: number,
    public readonly specialAttackRank: number,
    public readonly specialDefenseRank: number,
    public readonly speedRank: number,
    public readonly accuracyRank: number,
    public readonly evasionRank: number,
    public readonly statusCondition: StatusCondition | null
  ) {}

  /**
   * HPが0以下になったかどうか
   */
  isFainted(): boolean {
    return this.currentHp <= 0;
  }

  /**
   * 指定されたステータスランクを取得
   */
  getStatRank(stat: 'attack' | 'defense' | 'specialAttack' | 'specialDefense' | 'speed' | 'accuracy' | 'evasion'): number {
    switch (stat) {
      case 'attack':
        return this.attackRank;
      case 'defense':
        return this.defenseRank;
      case 'specialAttack':
        return this.specialAttackRank;
      case 'specialDefense':
        return this.specialDefenseRank;
      case 'speed':
        return this.speedRank;
      case 'accuracy':
        return this.accuracyRank;
      case 'evasion':
        return this.evasionRank;
    }
  }

  /**
   * ステータスランクに基づく倍率を取得
   * ランク: -6, -5, -4, -3, -2, -1, 0, +1, +2, +3, +4, +5, +6
   * 倍率: 2/8, 2/7, 2/6, 2/5, 2/4, 2/3, 1, 3/2, 4/2, 5/2, 6/2, 7/2, 8/2
   */
  getStatMultiplier(stat: 'attack' | 'defense' | 'specialAttack' | 'specialDefense' | 'speed' | 'accuracy' | 'evasion'): number {
    const rank = this.getStatRank(stat);

    if (rank === 0) {
      return 1;
    }

    if (rank > 0) {
      // 正のランク: (2 + rank) / 2
      return (2 + rank) / 2;
    } else {
      // 負のランク: 2 / (2 - rank)
      return 2 / (2 - rank);
    }
  }
}

