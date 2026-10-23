import { Pokemon } from '@/modules/pokemon/domain/entities/pokemon.entity';
import { Ability } from '@/modules/pokemon/domain/entities/ability.entity';
import { Nature } from '@/modules/battle/domain/logic/stat-calculator';
import { ValidationException } from '@/shared/domain/exceptions';

/**
 * Gender: 性別
 */
export enum Gender {
  Male = 'Male',
  Female = 'Female',
  Genderless = 'Genderless',
}

/**
 * TrainedPokemonエンティティ
 * 育成されたポケモンのドメインエンティティ
 */
export class TrainedPokemon {
  /**
   * レベル。チャンピオンズではすべてのポケモンがレベル 50 に固定される
   */
  static readonly LEVEL = 50;

  /**
   * レベル（常に 50）
   */
  public readonly level: number = TrainedPokemon.LEVEL;

  /**
   * 能力ポイントの 1 つの能力あたりの最大値
   */
  static readonly MAX_STAT_POINTS_PER_STAT = 32;

  /**
   * 能力ポイントの 6 つの能力の合計の最大値
   */
  static readonly MAX_STAT_POINTS_TOTAL = 66;

  /**
   * バトルで使える技の最大の数
   */
  static readonly MAX_MOVES = 4;

  /**
   * バトルで使う技の ID（slot の順。最大 4 つで、同じ技は入らない）
   * 空なら、バトルを始めるときに種族の覚える技から作る（技を選ぶ前のデータのための代わり）
   */
  public readonly moveIds: readonly number[];

  /**
   * チャンピオンズにない性格（補正なしの性格のうち、まじめ以外の 4 つ）
   */
  private static readonly UNAVAILABLE_NATURES: ReadonlySet<Nature> = new Set([
    Nature.Hardy,
    Nature.Docile,
    Nature.Bashful,
    Nature.Quirky,
  ]);

  constructor(
    public readonly id: number,
    public readonly trainerId: number,
    public readonly pokemon: Pokemon,
    public readonly nickname: string | null,
    public readonly gender: Gender | null,
    public readonly nature: Nature | null,
    public readonly ability: Ability | null,
    public readonly spHp: number,
    public readonly spAttack: number,
    public readonly spDefense: number,
    public readonly spSpecialAttack: number,
    public readonly spSpecialDefense: number,
    public readonly spSpeed: number,
    /**
     * 持ち物の名前（PokeAPI の ja-Hrkt 名）。持っていなければ null
     * バトルが始まると、バトル中の状態（persistentState.item）に写す
     */
    public readonly heldItem: string | null = null,
    /**
     * バトルで使う技の ID（slot の順）。省略すると空
     */
    moveIds: readonly number[] = [],
  ) {
    // 技のバリデーション（4 つまで・同じ技を重ねない）
    if (moveIds.length > TrainedPokemon.MAX_MOVES) {
      throw new ValidationException(
        `A pokemon can have at most ${TrainedPokemon.MAX_MOVES} moves. Got: ${moveIds.length}`,
        'moveIds',
      );
    }
    const duplicateMoveId = moveIds.find((moveId, index) => moveIds.indexOf(moveId) !== index);
    if (duplicateMoveId !== undefined) {
      throw new ValidationException(
        `A pokemon cannot have the same move twice: ${duplicateMoveId}`,
        'moveIds',
      );
    }
    this.moveIds = [...moveIds];

    // 能力補正（性格）のバリデーション。null は補正なしとして扱う
    if (nature !== null && TrainedPokemon.UNAVAILABLE_NATURES.has(nature)) {
      throw new ValidationException(
        `Nature ${nature} is not available in Champions. Use Serious for no stat change.`,
        'nature',
      );
    }

    // 能力ポイントのバリデーション（1 つの能力あたり）
    const statPoints = { spHp, spAttack, spDefense, spSpecialAttack, spSpecialDefense, spSpeed };
    for (const [field, value] of Object.entries(statPoints)) {
      if (
        !Number.isInteger(value) ||
        value < 0 ||
        value > TrainedPokemon.MAX_STAT_POINTS_PER_STAT
      ) {
        throw new ValidationException(
          `Stat points for ${field} must be an integer between 0 and ${TrainedPokemon.MAX_STAT_POINTS_PER_STAT}. Got: ${value}`,
          field,
        );
      }
    }

    // 能力ポイントの合計のバリデーション
    const total = Object.values(statPoints).reduce((sum, value) => sum + value, 0);
    if (total > TrainedPokemon.MAX_STAT_POINTS_TOTAL) {
      throw new ValidationException(
        `Total stat points must not exceed ${TrainedPokemon.MAX_STAT_POINTS_TOTAL}. Got: ${total}`,
        'spTotal',
      );
    }
  }
}
