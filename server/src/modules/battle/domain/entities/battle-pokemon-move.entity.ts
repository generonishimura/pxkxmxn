import { ValidationException } from '../../../../shared/domain/exceptions/validation.exception';

/**
 * BattlePokemonMoveエンティティ
 * バトル中のポケモンが持つ技とPPを管理
 */
export class BattlePokemonMove {
  /**
   * 最小ID値
   */
  private static readonly MIN_ID = 1;

  /**
   * 最小PP値
   */
  private static readonly MIN_PP = 0;

  constructor(
    public readonly id: number,
    public readonly battlePokemonStatusId: number,
    public readonly moveId: number,
    public readonly currentPp: number,
    public readonly maxPp: number,
  ) {
    // IDのバリデーション
    if (id < BattlePokemonMove.MIN_ID) {
      throw new ValidationException(
        `BattlePokemonMove ID must be at least ${BattlePokemonMove.MIN_ID}. Got: ${id}`,
        'id',
      );
    }

    if (battlePokemonStatusId < BattlePokemonMove.MIN_ID) {
      throw new ValidationException(
        `Battle Pokemon Status ID must be at least ${BattlePokemonMove.MIN_ID}. Got: ${battlePokemonStatusId}`,
        'battlePokemonStatusId',
      );
    }

    if (moveId < BattlePokemonMove.MIN_ID) {
      throw new ValidationException(
        `Move ID must be at least ${BattlePokemonMove.MIN_ID}. Got: ${moveId}`,
        'moveId',
      );
    }

    // PPのバリデーション
    if (maxPp < BattlePokemonMove.MIN_PP) {
      throw new ValidationException(
        `Max PP must be at least ${BattlePokemonMove.MIN_PP}. Got: ${maxPp}`,
        'maxPp',
      );
    }

    if (currentPp < BattlePokemonMove.MIN_PP) {
      throw new ValidationException(
        `Current PP must be at least ${BattlePokemonMove.MIN_PP}. Got: ${currentPp}`,
        'currentPp',
      );
    }

    if (currentPp > maxPp) {
      throw new ValidationException(
        `Current PP must not exceed Max PP. Got: currentPp=${currentPp}, maxPp=${maxPp}`,
        'currentPp',
      );
    }
  }

  /**
   * PPが0かどうか
   */
  isPpExhausted(): boolean {
    return this.currentPp <= 0;
  }

  /**
   * PPを消費
   * @param amount 消費するPP（デフォルト: 1）
   * @returns 消費後のPP
   */
  consumePp(amount: number = 1): number {
    return Math.max(0, this.currentPp - amount);
  }
}
