import { ValidationException } from '../../../../shared/domain/exceptions/validation.exception';

/**
 * Trainerエンティティ
 * トレーナーのドメインエンティティ
 */
export class Trainer {
  /**
   * 最小ID値
   */
  private static readonly MIN_ID = 1;

  /**
   * 名前の最小長
   */
  private static readonly MIN_NAME_LENGTH = 1;

  /**
   * 名前の最大長
   */
  private static readonly MAX_NAME_LENGTH = 50;

  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly email: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {
    // IDのバリデーション
    if (id < Trainer.MIN_ID) {
      throw new ValidationException(
        `Trainer ID must be at least ${Trainer.MIN_ID}. Got: ${id}`,
        'id',
      );
    }

    // 名前のバリデーション
    const trimmedNameLength = name.trim().length;
    if (
      trimmedNameLength < Trainer.MIN_NAME_LENGTH ||
      trimmedNameLength > Trainer.MAX_NAME_LENGTH
    ) {
      throw new ValidationException(
        `Trainer name must be between ${Trainer.MIN_NAME_LENGTH} and ${Trainer.MAX_NAME_LENGTH} characters. Got: ${trimmedNameLength}`,
        'name',
      );
    }

    // 日付のバリデーション
    if (!(createdAt instanceof Date) || isNaN(createdAt.getTime())) {
      throw new ValidationException(
        'Trainer createdAt must be a valid Date',
        'createdAt',
      );
    }

    if (!(updatedAt instanceof Date) || isNaN(updatedAt.getTime())) {
      throw new ValidationException(
        'Trainer updatedAt must be a valid Date',
        'updatedAt',
      );
    }
  }
}

