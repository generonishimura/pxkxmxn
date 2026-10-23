import { Pokemon } from '@/modules/pokemon/domain/entities/pokemon.entity';
import { Ability } from '@/modules/pokemon/domain/entities/ability.entity';
import { Nature } from '@/modules/battle/domain/logic/stat-calculator';

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
  ) {}
}
