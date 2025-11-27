import { Type } from './type.entity';
import { ValidationException } from '../../../../shared/domain/exceptions/validation.exception';

/**
 * Pokemonエンティティ
 * ポケモンのドメインエンティティ
 */
export class Pokemon {
  /**
   * 最小ID値
   */
  private static readonly MIN_ID = 1;

  /**
   * 最小図鑑番号
   */
  private static readonly MIN_NATIONAL_DEX = 1;

  /**
   * 最小基本ステータス値
   */
  private static readonly MIN_BASE_STAT = 1;

  /**
   * 最大基本ステータス値
   */
  private static readonly MAX_BASE_STAT = 255;

  constructor(
    public readonly id: number,
    public readonly nationalDex: number,
    public readonly name: string,
    public readonly nameEn: string,
    public readonly primaryType: Type,
    public readonly secondaryType: Type | null,
    public readonly baseHp: number,
    public readonly baseAttack: number,
    public readonly baseDefense: number,
    public readonly baseSpecialAttack: number,
    public readonly baseSpecialDefense: number,
    public readonly baseSpeed: number
  ) {
    // IDのバリデーション
    if (id < Pokemon.MIN_ID) {
      throw new ValidationException(
        `Pokemon ID must be at least ${Pokemon.MIN_ID}. Got: ${id}`,
        'id',
      );
    }

    // 図鑑番号のバリデーション
    if (nationalDex < Pokemon.MIN_NATIONAL_DEX) {
      throw new ValidationException(
        `National Dex must be at least ${Pokemon.MIN_NATIONAL_DEX}. Got: ${nationalDex}`,
        'nationalDex',
      );
    }

    // 名前のバリデーション
    if (!name || name.trim().length === 0) {
      throw new ValidationException(
        'Pokemon name must not be empty',
        'name',
      );
    }

    if (!nameEn || nameEn.trim().length === 0) {
      throw new ValidationException(
        'Pokemon nameEn must not be empty',
        'nameEn',
      );
    }

    // 基本ステータスのバリデーション
    const baseStats = [
      { value: baseHp, name: 'baseHp' },
      { value: baseAttack, name: 'baseAttack' },
      { value: baseDefense, name: 'baseDefense' },
      { value: baseSpecialAttack, name: 'baseSpecialAttack' },
      { value: baseSpecialDefense, name: 'baseSpecialDefense' },
      { value: baseSpeed, name: 'baseSpeed' },
    ];

    for (const stat of baseStats) {
      if (
        stat.value < Pokemon.MIN_BASE_STAT ||
        stat.value > Pokemon.MAX_BASE_STAT
      ) {
        throw new ValidationException(
          `${stat.name} must be between ${Pokemon.MIN_BASE_STAT} and ${Pokemon.MAX_BASE_STAT}. Got: ${stat.value}`,
          stat.name,
        );
      }
    }
  }
}
