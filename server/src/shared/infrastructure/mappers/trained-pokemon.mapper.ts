import { Prisma } from '@generated/prisma/client';
import { TrainedPokemon, Gender } from '@/modules/trainer/domain/entities/trained-pokemon.entity';
import { Nature } from '@/modules/battle/domain/logic/stat-calculator';
import { PokemonMapper } from './pokemon.mapper';
import { AbilityMapper } from './ability.mapper';

/**
 * TrainedPokemon を読むときの include（TrainedPokemonMapper に渡すデータを取るクエリは、これを使う）
 * 技は slot の順に読む
 */
export const TRAINED_POKEMON_INCLUDE = {
  pokemon: {
    include: {
      primaryType: true,
      secondaryType: true,
    },
  },
  ability: true,
  moves: {
    orderBy: { slot: 'asc' },
  },
} as const satisfies Prisma.TrainedPokemonInclude;

/**
 * TrainedPokemonのPrismaクエリ結果型（include付き）
 */
export type TrainedPokemonWithRelations = Prisma.TrainedPokemonGetPayload<{
  include: typeof TRAINED_POKEMON_INCLUDE;
}>;

/**
 * TrainedPokemonMapper
 * PrismaのTrainedPokemonデータをDomain層のTrainedPokemonエンティティに変換するMapper
 */
export class TrainedPokemonMapper {
  /**
   * PrismaのTrainedPokemonデータをDomain層のTrainedPokemonエンティティに変換
   */
  static toDomainEntity(trainedPokemonData: TrainedPokemonWithRelations): TrainedPokemon {
    // PokemonMapperを使用してPokemonエンティティを作成
    const pokemon = PokemonMapper.toDomainEntity(trainedPokemonData.pokemon);

    // AbilityMapperを使用してAbilityエンティティを作成（存在する場合）
    const ability = trainedPokemonData.ability
      ? AbilityMapper.toDomainEntity(trainedPokemonData.ability)
      : null;

    return new TrainedPokemon(
      trainedPokemonData.id,
      trainedPokemonData.trainerId,
      pokemon,
      trainedPokemonData.nickname,
      trainedPokemonData.gender as Gender | null,
      trainedPokemonData.nature as Nature | null,
      ability,
      trainedPokemonData.spHp,
      trainedPokemonData.spAttack,
      trainedPokemonData.spDefense,
      trainedPokemonData.spSpecialAttack,
      trainedPokemonData.spSpecialDefense,
      trainedPokemonData.spSpeed,
      trainedPokemonData.heldItem,
      // クエリの並びに頼らず、ここでも slot の順に並べる
      [...trainedPokemonData.moves]
        .sort((a, b) => a.slot - b.slot)
        .map(trainedPokemonMove => trainedPokemonMove.moveId),
    );
  }
}

