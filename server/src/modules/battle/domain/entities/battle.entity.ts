import { ValidationException } from '../../../../shared/domain/exceptions/validation.exception';

/**
 * Battleエンティティ
 * バトルのドメインエンティティ
 */
export class Battle {
  /**
   * 最小ID値
   */
  private static readonly MIN_ID = 1;

  /**
   * 最小ターン数
   */
  private static readonly MIN_TURN = 1;

  constructor(
    public readonly id: number,
    public readonly trainer1Id: number,
    public readonly trainer2Id: number,
    public readonly team1Id: number,
    public readonly team2Id: number,
    public readonly turn: number,
    public readonly weather: Weather | null,
    public readonly field: Field | null,
    public readonly status: BattleStatus,
    public readonly winnerTrainerId: number | null,
  ) {
    // IDのバリデーション
    if (id < Battle.MIN_ID) {
      throw new ValidationException(
        `Battle ID must be at least ${Battle.MIN_ID}. Got: ${id}`,
        'id',
      );
    }

    // トレーナーIDのバリデーション
    if (trainer1Id < Battle.MIN_ID) {
      throw new ValidationException(
        `Trainer1 ID must be at least ${Battle.MIN_ID}. Got: ${trainer1Id}`,
        'trainer1Id',
      );
    }

    if (trainer2Id < Battle.MIN_ID) {
      throw new ValidationException(
        `Trainer2 ID must be at least ${Battle.MIN_ID}. Got: ${trainer2Id}`,
        'trainer2Id',
      );
    }

    // 同じトレーナー同士のバトルは不可
    if (trainer1Id === trainer2Id) {
      throw new ValidationException(
        `Trainer1 ID and Trainer2 ID must be different. Got: ${trainer1Id}`,
        'trainer1Id',
      );
    }

    // チームIDのバリデーション
    if (team1Id < Battle.MIN_ID) {
      throw new ValidationException(
        `Team1 ID must be at least ${Battle.MIN_ID}. Got: ${team1Id}`,
        'team1Id',
      );
    }

    if (team2Id < Battle.MIN_ID) {
      throw new ValidationException(
        `Team2 ID must be at least ${Battle.MIN_ID}. Got: ${team2Id}`,
        'team2Id',
      );
    }

    // 同じチーム同士のバトルは不可
    if (team1Id === team2Id) {
      throw new ValidationException(
        `Team1 ID and Team2 ID must be different. Got: ${team1Id}`,
        'team1Id',
      );
    }

    // ターン数のバリデーション
    if (turn < Battle.MIN_TURN) {
      throw new ValidationException(
        `Turn must be at least ${Battle.MIN_TURN}. Got: ${turn}`,
        'turn',
      );
    }

    // 勝者IDのバリデーション（nullまたは1以上）
    if (winnerTrainerId !== null && winnerTrainerId < Battle.MIN_ID) {
      throw new ValidationException(
        `Winner Trainer ID must be at least ${Battle.MIN_ID} or null. Got: ${winnerTrainerId}`,
        'winnerTrainerId',
      );
    }
  }
}

export enum Weather {
  None = 'None',
  Sun = 'Sun',
  Rain = 'Rain',
  Sandstorm = 'Sandstorm',
  Hail = 'Hail',
}

export enum Field {
  None = 'None',
  ElectricTerrain = 'ElectricTerrain',
  GrassyTerrain = 'GrassyTerrain',
  PsychicTerrain = 'PsychicTerrain',
  MistyTerrain = 'MistyTerrain',
}

export enum BattleStatus {
  Active = 'Active',
  Completed = 'Completed',
  Abandoned = 'Abandoned',
}
