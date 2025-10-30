import { Pokemon } from '../../../pokemon/domain/entities/pokemon.entity';
import { Ability } from '../../../pokemon/domain/entities/ability.entity';
import { Nature } from '../../../battle/domain/logic/stat-calculator';

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
  ) {}
}

