import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import {
  IPokemonRepository,
  IAbilityRepository,
} from '../../domain/pokemon.repository.interface';
import { Pokemon } from '../../domain/entities/pokemon.entity';
import { Type } from '../../domain/entities/type.entity';
import { Ability, AbilityTrigger, AbilityCategory } from '../../domain/entities/ability.entity';

/**
 * PokemonリポジトリのPrisma実装
 * Domain層で定義したインターフェースの具象実装
 */
@Injectable()
export class PokemonPrismaRepository implements IPokemonRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number): Promise<Pokemon | null> {
    const pokemonData = await this.prisma.pokemon.findUnique({
      where: { id },
      include: {
        primaryType: true,
        secondaryType: true,
      },
    });

    if (!pokemonData) {
      return null;
    }

    return this.toDomainEntity(pokemonData);
  }

  async findByNationalDex(nationalDex: number): Promise<Pokemon | null> {
    const pokemonData = await this.prisma.pokemon.findUnique({
      where: { nationalDex },
      include: {
        primaryType: true,
        secondaryType: true,
      },
    });

    if (!pokemonData) {
      return null;
    }

    return this.toDomainEntity(pokemonData);
  }

  async findByName(name: string): Promise<Pokemon | null> {
    const pokemonData = await this.prisma.pokemon.findUnique({
      where: { name },
      include: {
        primaryType: true,
        secondaryType: true,
      },
    });

    if (!pokemonData) {
      return null;
    }

    return this.toDomainEntity(pokemonData);
  }

  /**
   * PrismaのデータモデルをDomain層のエンティティに変換
   */
  private toDomainEntity(pokemonData: any): Pokemon {
    const primaryType = new Type(
      pokemonData.primaryType.id,
      pokemonData.primaryType.name,
      pokemonData.primaryType.nameEn,
    );

    const secondaryType = pokemonData.secondaryType
      ? new Type(
          pokemonData.secondaryType.id,
          pokemonData.secondaryType.name,
          pokemonData.secondaryType.nameEn,
        )
      : null;

    return new Pokemon(
      pokemonData.id,
      pokemonData.nationalDex,
      pokemonData.name,
      pokemonData.nameEn,
      primaryType,
      secondaryType,
      pokemonData.baseHp,
      pokemonData.baseAttack,
      pokemonData.baseDefense,
      pokemonData.baseSpecialAttack,
      pokemonData.baseSpecialDefense,
      pokemonData.baseSpeed,
    );
  }
}

/**
 * AbilityリポジトリのPrisma実装
 */
@Injectable()
export class AbilityPrismaRepository implements IAbilityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number): Promise<Ability | null> {
    const abilityData = await this.prisma.ability.findUnique({
      where: { id },
    });

    if (!abilityData) {
      return null;
    }

    return this.toDomainEntity(abilityData);
  }

  async findByName(name: string): Promise<Ability | null> {
    const abilityData = await this.prisma.ability.findUnique({
      where: { name },
    });

    if (!abilityData) {
      return null;
    }

    return this.toDomainEntity(abilityData);
  }

  async findByPokemonId(pokemonId: number): Promise<Ability[]> {
    const pokemonAbilities = await this.prisma.pokemonAbility.findMany({
      where: { pokemonId },
      include: {
        ability: true,
      },
    });

    return pokemonAbilities.map((pa) => this.toDomainEntity(pa.ability));
  }

  /**
   * PrismaのデータモデルをDomain層のエンティティに変換
   */
  private toDomainEntity(abilityData: any): Ability {
    return new Ability(
      abilityData.id,
      abilityData.name,
      abilityData.nameEn,
      abilityData.description,
      abilityData.triggerEvent as AbilityTrigger,
      abilityData.effectCategory as AbilityCategory,
    );
  }
}

