import { StatusCondition } from './status-condition.enum';
import { ValidationException } from '../../../../shared/domain/exceptions/validation.exception';

/**
 * BattlePokemonStatusエンティティ
 * バトル中のポケモン個別の状態を管理
 */
export class BattlePokemonStatus {
  /**
   * 最小ID値
   */
  private static readonly MIN_ID = 1;

  /**
   * 最小HP値
   */
  private static readonly MIN_HP = 1;

  /**
   * ステータスランクの最小値
   */
  private static readonly MIN_RANK = -6;

  /**
   * ステータスランクの最大値
   */
  private static readonly MAX_RANK = 6;

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
    public readonly statusCondition: StatusCondition | null,
  ) {
    // IDのバリデーション
    if (id < BattlePokemonStatus.MIN_ID) {
      throw new ValidationException(
        `BattlePokemonStatus ID must be at least ${BattlePokemonStatus.MIN_ID}. Got: ${id}`,
        'id',
      );
    }

    if (battleId < BattlePokemonStatus.MIN_ID) {
      throw new ValidationException(
        `Battle ID must be at least ${BattlePokemonStatus.MIN_ID}. Got: ${battleId}`,
        'battleId',
      );
    }

    if (trainedPokemonId < BattlePokemonStatus.MIN_ID) {
      throw new ValidationException(
        `Trained Pokemon ID must be at least ${BattlePokemonStatus.MIN_ID}. Got: ${trainedPokemonId}`,
        'trainedPokemonId',
      );
    }

    if (trainerId < BattlePokemonStatus.MIN_ID) {
      throw new ValidationException(
        `Trainer ID must be at least ${BattlePokemonStatus.MIN_ID}. Got: ${trainerId}`,
        'trainerId',
      );
    }

    // HPのバリデーション
    if (maxHp < BattlePokemonStatus.MIN_HP) {
      throw new ValidationException(
        `Max HP must be at least ${BattlePokemonStatus.MIN_HP}. Got: ${maxHp}`,
        'maxHp',
      );
    }

    if (currentHp < 0) {
      throw new ValidationException(
        `Current HP must be at least 0. Got: ${currentHp}`,
        'currentHp',
      );
    }

    if (currentHp > maxHp) {
      throw new ValidationException(
        `Current HP must not exceed Max HP. Got: currentHp=${currentHp}, maxHp=${maxHp}`,
        'currentHp',
      );
    }

    // ステータスランクのバリデーション
    const ranks = [
      { value: attackRank, name: 'attackRank' },
      { value: defenseRank, name: 'defenseRank' },
      { value: specialAttackRank, name: 'specialAttackRank' },
      { value: specialDefenseRank, name: 'specialDefenseRank' },
      { value: speedRank, name: 'speedRank' },
      { value: accuracyRank, name: 'accuracyRank' },
      { value: evasionRank, name: 'evasionRank' },
    ];

    for (const rank of ranks) {
      if (
        rank.value < BattlePokemonStatus.MIN_RANK ||
        rank.value > BattlePokemonStatus.MAX_RANK
      ) {
        throw new ValidationException(
          `${rank.name} must be between ${BattlePokemonStatus.MIN_RANK} and ${BattlePokemonStatus.MAX_RANK}. Got: ${rank.value}`,
          rank.name,
        );
      }
    }
  }

  /**
   * HPが0以下になったかどうか
   */
  isFainted(): boolean {
    return this.currentHp <= 0;
  }

  /**
   * 指定されたステータスランクを取得
   */
  getStatRank(
    stat:
      | 'attack'
      | 'defense'
      | 'specialAttack'
      | 'specialDefense'
      | 'speed'
      | 'accuracy'
      | 'evasion',
  ): number {
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
  getStatMultiplier(
    stat:
      | 'attack'
      | 'defense'
      | 'specialAttack'
      | 'specialDefense'
      | 'speed'
      | 'accuracy'
      | 'evasion',
  ): number {
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
