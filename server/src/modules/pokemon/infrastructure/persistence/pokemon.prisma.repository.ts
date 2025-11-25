import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { Prisma } from '@generated/prisma/client';
import {
  IPokemonRepository,
  IAbilityRepository,
  IMoveRepository,
  ITypeEffectivenessRepository,
  TypeEffectivenessMap,
} from '../../domain/pokemon.repository.interface';
import { Pokemon } from '../../domain/entities/pokemon.entity';
import { Ability } from '../../domain/entities/ability.entity';
import { Move } from '../../domain/entities/move.entity';
import { PokemonMapper, AbilityMapper, MoveMapper } from '@/shared/infrastructure/mappers';

/**
 * PokemonのPrismaクエリ結果型（include付き）
 */
type PokemonWithTypes = Prisma.PokemonGetPayload<{
  include: {
    primaryType: true;
    secondaryType: true;
  };
}>;

/**
 * MoveのPrismaクエリ結果型（include付き）
 */
type MoveWithRelations = Prisma.MoveGetPayload<{
  include: {
    type: true;
  };
}>;

/**
 * AbilityのPrismaクエリ結果型
 */
type AbilityData = Prisma.AbilityGetPayload<{}>;

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

    return PokemonMapper.toDomainEntity(pokemonData);
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

    return PokemonMapper.toDomainEntity(pokemonData);
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

    return PokemonMapper.toDomainEntity(pokemonData);
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

    return AbilityMapper.toDomainEntity(abilityData);
  }

  async findByName(name: string): Promise<Ability | null> {
    const abilityData = await this.prisma.ability.findUnique({
      where: { name },
    });

    if (!abilityData) {
      return null;
    }

    return AbilityMapper.toDomainEntity(abilityData);
  }

  async findByPokemonId(pokemonId: number): Promise<Ability[]> {
    const pokemonAbilities = await this.prisma.pokemonAbility.findMany({
      where: { pokemonId },
      include: {
        ability: true,
      },
    });

    return pokemonAbilities.map(pa => AbilityMapper.toDomainEntity(pa.ability));
  }
}

/**
 * MoveリポジトリのPrisma実装
 */
@Injectable()
export class MovePrismaRepository implements IMoveRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number): Promise<Move | null> {
    const moveData = await this.prisma.move.findUnique({
      where: { id },
      include: {
        type: true,
      },
    });

    if (!moveData) {
      return null;
    }

    return MoveMapper.toDomainEntity(moveData);
  }

  async findByPokemonId(pokemonId: number): Promise<Move[]> {
    // ポケモンが覚えている技を取得(最大4つ、簡略化のため最初の4つ)
    const pokemonMoves = await this.prisma.pokemonMove.findMany({
      where: { pokemonId },
      take: 4, // 最大4つ
      include: {
        move: {
          include: {
            type: true,
          },
        },
      },
    });

    return pokemonMoves.map(pm => MoveMapper.toDomainEntity(pm.move));
  }
}

/**
 * TypeEffectivenessリポジトリのPrisma実装
 */
@Injectable()
export class TypeEffectivenessPrismaRepository implements ITypeEffectivenessRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getTypeEffectivenessMap(): Promise<TypeEffectivenessMap> {
    const effectivenessList = await this.prisma.typeEffectiveness.findMany();
    const map = new Map<string, number>();

    for (const eff of effectivenessList) {
      const key = `${eff.typeFromId}-${eff.typeToId}`;
      map.set(key, eff.effectiveness);
    }

    return map;
  }
}
