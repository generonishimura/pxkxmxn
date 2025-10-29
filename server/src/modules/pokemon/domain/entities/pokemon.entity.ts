import { Type } from './type.entity';

/**
 * Pokemonエンティティ
 * ポケモンのドメインエンティティ
 */
export class Pokemon {
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
    public readonly baseSpeed: number,
  ) {}
}

