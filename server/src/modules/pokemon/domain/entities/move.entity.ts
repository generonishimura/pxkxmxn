import { Type } from './type.entity';
import { ValidationException } from '../../../../shared/domain/exceptions/validation.exception';

/**
 * MoveCategory: 技のカテゴリ（物理、特殊、変化）
 */
export enum MoveCategory {
  Physical = 'Physical',
  Special = 'Special',
  Status = 'Status',
}

/**
 * Moveエンティティ
 * 技のドメインエンティティ
 */
export class Move {
  /**
   * 最小ID値
   */
  private static readonly MIN_ID = 1;

  /**
   * 最小威力値
   */
  private static readonly MIN_POWER = 1;

  /**
   * 最大威力値
   */
  private static readonly MAX_POWER = 300;

  /**
   * 最小命中率
   */
  private static readonly MIN_ACCURACY = 1;

  /**
   * 最大命中率
   */
  private static readonly MAX_ACCURACY = 100;

  /**
   * 最小PP値
   */
  private static readonly MIN_PP = 1;

  /**
   * 最大PP値
   */
  private static readonly MAX_PP = 40;

  /**
   * 最小優先度
   */
  private static readonly MIN_PRIORITY = -7;

  /**
   * 最大優先度
   */
  private static readonly MAX_PRIORITY = 5;

  /**
   * 名前のバリデーション
   * @param value 検証する名前
   * @param fieldName フィールド名（エラーメッセージ用）
   */
  private static validateName(value: string, fieldName: string): void {
    if (!value || value.trim().length === 0) {
      throw new ValidationException(
        `Move ${fieldName} must not be empty`,
        fieldName,
      );
    }
  }

  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly nameEn: string,
    public readonly type: Type,
    public readonly category: MoveCategory,
    public readonly power: number | null, // 変化技の場合はnull
    public readonly accuracy: number | null, // 必中技の場合はnull
    public readonly pp: number,
    public readonly priority: number, // 優先度
    public readonly description: string | null,
  ) {
    // IDのバリデーション
    if (id < Move.MIN_ID) {
      throw new ValidationException(
        `Move ID must be at least ${Move.MIN_ID}. Got: ${id}`,
        'id',
      );
    }

    // 名前のバリデーション
    Move.validateName(name, 'name');
    Move.validateName(nameEn, 'nameEn');

    // 威力のバリデーション（変化技の場合はnullが許可される）
    if (power !== null) {
      if (power < Move.MIN_POWER || power > Move.MAX_POWER) {
        throw new ValidationException(
          `Move power must be between ${Move.MIN_POWER} and ${Move.MAX_POWER} or null. Got: ${power}`,
          'power',
        );
      }
    }

    // 命中率のバリデーション（必中技の場合はnullが許可される）
    if (accuracy !== null) {
      if (
        accuracy < Move.MIN_ACCURACY ||
        accuracy > Move.MAX_ACCURACY
      ) {
        throw new ValidationException(
          `Move accuracy must be between ${Move.MIN_ACCURACY} and ${Move.MAX_ACCURACY} or null. Got: ${accuracy}`,
          'accuracy',
        );
      }
    }

    // PPのバリデーション
    if (pp < Move.MIN_PP || pp > Move.MAX_PP) {
      throw new ValidationException(
        `Move PP must be between ${Move.MIN_PP} and ${Move.MAX_PP}. Got: ${pp}`,
        'pp',
      );
    }

    // 優先度のバリデーション
    if (
      priority < Move.MIN_PRIORITY ||
      priority > Move.MAX_PRIORITY
    ) {
      throw new ValidationException(
        `Move priority must be between ${Move.MIN_PRIORITY} and ${Move.MAX_PRIORITY}. Got: ${priority}`,
        'priority',
      );
    }
  }
}

