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
   * レベルの最小値
   */
  private static readonly MIN_LEVEL = 1;

  /**
   * レベルの最大値
   */
  private static readonly MAX_LEVEL = 100;

  /**
   * 個体値（IV）の最小値
   */
  private static readonly MIN_IV = 0;

  /**
   * 個体値（IV）の最大値
   */
  private static readonly MAX_IV = 31;

  /**
   * 努力値（EV）の最小値
   */
  private static readonly MIN_EV = 0;

  /**
   * 努力値（EV）の最大値（1つのステータスあたり）
   */
  private static readonly MAX_EV_PER_STAT = 255;

  /**
   * 努力値（EV）の合計最大値
   */
  private static readonly MAX_EV_TOTAL = 510;

  constructor(
    public readonly id: number,
    public readonly trainerId: number,
    public readonly pokemon: Pokemon,
    public readonly nickname: string | null,
    public readonly level: number,
    public readonly gender: Gender | null,
    public readonly nature: Nature | null,
    public readonly ability: Ability | null,
    public readonly ivHp: number,
    public readonly ivAttack: number,
    public readonly ivDefense: number,
    public readonly ivSpecialAttack: number,
    public readonly ivSpecialDefense: number,
    public readonly ivSpeed: number,
    public readonly evHp: number,
    public readonly evAttack: number,
    public readonly evDefense: number,
    public readonly evSpecialAttack: number,
    public readonly evSpecialDefense: number,
    public readonly evSpeed: number,
  ) {
    // レベルのバリデーション
    if (level < TrainedPokemon.MIN_LEVEL || level > TrainedPokemon.MAX_LEVEL) {
      throw new ValidationException(
        `Level must be between ${TrainedPokemon.MIN_LEVEL} and ${TrainedPokemon.MAX_LEVEL}. Got: ${level}`,
        'level',
      );
    }

    // 個体値（IV）のバリデーション
    const ivs = [ivHp, ivAttack, ivDefense, ivSpecialAttack, ivSpecialDefense, ivSpeed];
    const ivNames = ['HP', 'Attack', 'Defense', 'SpecialAttack', 'SpecialDefense', 'Speed'];
    for (let i = 0; i < ivs.length; i++) {
      const iv = ivs[i];
      const ivName = ivNames[i];
      if (iv < TrainedPokemon.MIN_IV || iv > TrainedPokemon.MAX_IV) {
        throw new ValidationException(
          `${ivName} IV must be between ${TrainedPokemon.MIN_IV} and ${TrainedPokemon.MAX_IV}. Got: ${iv}`,
          `iv${ivName}`,
        );
      }
    }

    // 努力値（EV）のバリデーション（1つのステータスあたり）
    const evs = [evHp, evAttack, evDefense, evSpecialAttack, evSpecialDefense, evSpeed];
    const evNames = ['HP', 'Attack', 'Defense', 'SpecialAttack', 'SpecialDefense', 'Speed'];
    for (let i = 0; i < evs.length; i++) {
      const ev = evs[i];
      const evName = evNames[i];
      if (ev < TrainedPokemon.MIN_EV || ev > TrainedPokemon.MAX_EV_PER_STAT) {
        throw new ValidationException(
          `${evName} EV must be between ${TrainedPokemon.MIN_EV} and ${TrainedPokemon.MAX_EV_PER_STAT}. Got: ${ev}`,
          `ev${evName}`,
        );
      }
    }

    // 努力値（EV）の合計バリデーション
    const evTotal = evs.reduce((sum, ev) => sum + ev, 0);
    if (evTotal > TrainedPokemon.MAX_EV_TOTAL) {
      throw new ValidationException(
        `Total EV must not exceed ${TrainedPokemon.MAX_EV_TOTAL}. Got: ${evTotal}`,
        'evTotal',
      );
    }
  }
}
