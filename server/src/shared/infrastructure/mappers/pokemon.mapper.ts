import { Prisma } from '@generated/prisma/client';
import { Pokemon } from '@/modules/pokemon/domain/entities/pokemon.entity';
import { Type } from '@/modules/pokemon/domain/entities/type.entity';

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
 * PokemonMapper
 * PrismaのPokemonデータをDomain層のPokemonエンティティに変換するMapper
 */
export class PokemonMapper {
  /**
   * PrismaのPokemonデータをDomain層のPokemonエンティティに変換
   */
  static toDomainEntity(pokemonData: PokemonWithTypes): Pokemon {
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

