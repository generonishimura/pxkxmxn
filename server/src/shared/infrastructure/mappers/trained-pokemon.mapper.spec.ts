import { TrainedPokemonMapper, TrainedPokemonWithRelations } from './trained-pokemon.mapper';
import { TrainedPokemon, Gender } from '@/modules/trainer/domain/entities/trained-pokemon.entity';
import { Pokemon } from '@/modules/pokemon/domain/entities/pokemon.entity';
import { Type } from '@/modules/pokemon/domain/entities/type.entity';
import { Ability } from '@/modules/pokemon/domain/entities/ability.entity';
import { Prisma } from '@generated/prisma/client';

describe('TrainedPokemonMapper', () => {
  describe('toDomainEntity', () => {
    it('should convert Prisma TrainedPokemon data to domain entity', () => {
      const trainedPokemonData: TrainedPokemonWithRelations = {
        id: 1,
        trainerId: 1,
        pokemonId: 25,
        nickname: 'ピカチュウ',
        level: 50,
        gender: 'Male' as Gender,
        nature: 'Adamant',
        abilityId: 1,
        ivHp: 31,
        ivAttack: 31,
        ivDefense: 31,
        ivSpecialAttack: 31,
        ivSpecialDefense: 31,
        ivSpeed: 31,
        evHp: 252,
        evAttack: 252,
        evDefense: 0,
        evSpecialAttack: 0,
        evSpecialDefense: 0,
        evSpeed: 6,
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemon: {
          id: 25,
          nationalDex: 25,
          name: 'ピカチュウ',
          nameEn: 'Pikachu',
          baseHp: 35,
          baseAttack: 55,
          baseDefense: 40,
          baseSpecialAttack: 50,
          baseSpecialDefense: 50,
          baseSpeed: 90,
          primaryType: {
            id: 1,
            name: 'でんき',
            nameEn: 'Electric',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          secondaryType: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          primaryTypeId: 1,
          secondaryTypeId: null,
        },
        ability: {
          id: 1,
          name: 'せいでんき',
          nameEn: 'Static',
          description: '接触技を受けると相手をまひ状態にすることがある',
          triggerEvent: 'OnEntry',
          effectCategory: 'StatusCondition',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const result = TrainedPokemonMapper.toDomainEntity(trainedPokemonData);

      expect(result).toBeInstanceOf(TrainedPokemon);
      expect(result.id).toBe(1);
      expect(result.trainerId).toBe(1);
      expect(result.pokemon).toBeInstanceOf(Pokemon);
      expect(result.nickname).toBe('ピカチュウ');
      expect(result.level).toBe(50);
      expect(result.gender).toBe(Gender.Male);
      expect(result.ability).toBeInstanceOf(Ability);
      expect(result.ability?.name).toBe('せいでんき');
      expect(result.ivHp).toBe(31);
      expect(result.evHp).toBe(252);
    });

    it('should convert Prisma TrainedPokemon data without ability to domain entity', () => {
      const trainedPokemonData: TrainedPokemonWithRelations = {
        id: 2,
        trainerId: 1,
        pokemonId: 25,
        nickname: null,
        level: 50,
        gender: null,
        nature: null,
        abilityId: null,
        ivHp: 31,
        ivAttack: 31,
        ivDefense: 31,
        ivSpecialAttack: 31,
        ivSpecialDefense: 31,
        ivSpeed: 31,
        evHp: 0,
        evAttack: 0,
        evDefense: 0,
        evSpecialAttack: 0,
        evSpecialDefense: 0,
        evSpeed: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemon: {
          id: 25,
          nationalDex: 25,
          name: 'ピカチュウ',
          nameEn: 'Pikachu',
          baseHp: 35,
          baseAttack: 55,
          baseDefense: 40,
          baseSpecialAttack: 50,
          baseSpecialDefense: 50,
          baseSpeed: 90,
          primaryType: {
            id: 1,
            name: 'でんき',
            nameEn: 'Electric',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          secondaryType: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          primaryTypeId: 1,
          secondaryTypeId: null,
        },
        ability: null,
      } as TrainedPokemonWithRelations;

      const result = TrainedPokemonMapper.toDomainEntity(trainedPokemonData);

      expect(result).toBeInstanceOf(TrainedPokemon);
      expect(result.nickname).toBeNull();
      expect(result.gender).toBeNull();
      expect(result.nature).toBeNull();
      expect(result.ability).toBeNull();
    });
  });
});

