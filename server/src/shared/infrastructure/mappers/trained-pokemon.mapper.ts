import { Prisma } from '@generated/prisma/client';
import { TrainedPokemon, Gender } from '@/modules/trainer/domain/entities/trained-pokemon.entity';
import { Pokemon } from '@/modules/pokemon/domain/entities/pokemon.entity';
import { Ability } from '@/modules/pokemon/domain/entities/ability.entity';
import { Nature } from '@/modules/battle/domain/logic/stat-calculator';
import { PokemonMapper } from './pokemon.mapper';
import { AbilityMapper } from './ability.mapper';

/**
 * TrainedPokemonのPrismaクエリ結果型（include付き）
 */
export type TrainedPokemonWithRelations = Prisma.TrainedPokemonGetPayload<{
  include: {
    pokemon: {
      include: {
        primaryType: true;
        secondaryType: true;
      };
    };
    ability: true;
  };
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
      trainedPokemonData.level,
      trainedPokemonData.gender as Gender | null,
      trainedPokemonData.nature as Nature | null,
      ability,
      trainedPokemonData.ivHp,
      trainedPokemonData.ivAttack,
      trainedPokemonData.ivDefense,
      trainedPokemonData.ivSpecialAttack,
      trainedPokemonData.ivSpecialDefense,
      trainedPokemonData.ivSpeed,
      trainedPokemonData.evHp,
      trainedPokemonData.evAttack,
      trainedPokemonData.evDefense,
      trainedPokemonData.evSpecialAttack,
      trainedPokemonData.evSpecialDefense,
      trainedPokemonData.evSpeed,
    );
  }
}

