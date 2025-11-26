import { PokemonMapper } from './pokemon.mapper';
import { Pokemon } from '@/modules/pokemon/domain/entities/pokemon.entity';
import { Type } from '@/modules/pokemon/domain/entities/type.entity';
import { Prisma } from '@generated/prisma/client';

describe('PokemonMapper', () => {
  describe('toDomainEntity', () => {
    it('should convert Prisma Pokemon data to domain entity', () => {
      const pokemonData: Prisma.PokemonGetPayload<{
        include: {
          primaryType: true;
          secondaryType: true;
        };
      }> = {
        id: 1,
        nationalDex: 25,
        name: 'ピカチュウ',
        nameEn: 'Pikachu',
        baseHp: 35,
        baseAttack: 55,
        baseDefense: 40,
        baseSpecialAttack: 50,
        baseSpecialDefense: 50,
        baseSpeed: 90,
        createdAt: new Date(),
        updatedAt: new Date(),
        primaryTypeId: 1,
        secondaryTypeId: null,
        primaryType: {
          id: 1,
          name: 'でんき',
          nameEn: 'Electric',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        secondaryType: null,
      } as Prisma.PokemonGetPayload<{
        include: {
          primaryType: true;
          secondaryType: true;
        };
      }>;

      const result = PokemonMapper.toDomainEntity(pokemonData);

      expect(result).toBeInstanceOf(Pokemon);
      expect(result.id).toBe(1);
      expect(result.nationalDex).toBe(25);
      expect(result.name).toBe('ピカチュウ');
      expect(result.nameEn).toBe('Pikachu');
      expect(result.primaryType).toBeInstanceOf(Type);
      expect(result.primaryType.name).toBe('でんき');
      expect(result.secondaryType).toBeNull();
      expect(result.baseHp).toBe(35);
      expect(result.baseAttack).toBe(55);
      expect(result.baseDefense).toBe(40);
      expect(result.baseSpecialAttack).toBe(50);
      expect(result.baseSpecialDefense).toBe(50);
      expect(result.baseSpeed).toBe(90);
    });

    it('should convert Prisma Pokemon data with secondary type to domain entity', () => {
      const pokemonData = {
        id: 6,
        nationalDex: 6,
        name: 'リザードン',
        nameEn: 'Charizard',
        baseHp: 78,
        baseAttack: 84,
        baseDefense: 78,
        baseSpecialAttack: 109,
        baseSpecialDefense: 85,
        baseSpeed: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
        primaryTypeId: 2,
        secondaryTypeId: 10,
        primaryType: {
          id: 2,
          name: 'ほのお',
          nameEn: 'Fire',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        secondaryType: {
          id: 10,
          name: 'ひこう',
          nameEn: 'Flying',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      } as Prisma.PokemonGetPayload<{
        include: {
          primaryType: true;
          secondaryType: true;
        };
      }>;

      const result = PokemonMapper.toDomainEntity(pokemonData);

      expect(result).toBeInstanceOf(Pokemon);
      expect(result.primaryType).toBeInstanceOf(Type);
      expect(result.primaryType.name).toBe('ほのお');
      expect(result.secondaryType).toBeInstanceOf(Type);
      expect(result.secondaryType?.name).toBe('ひこう');
    });
  });
});

