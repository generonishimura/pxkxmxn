import { MoveMapper } from './move.mapper';
import { Move } from '@/modules/pokemon/domain/entities/move.entity';
import { Type } from '@/modules/pokemon/domain/entities/type.entity';
import { Prisma } from '@generated/prisma/client';

describe('MoveMapper', () => {
  describe('toDomainEntity', () => {
    it('should convert Prisma Move data to domain entity', () => {
      const moveData = {
        id: 1,
        name: 'でんきショック',
        nameEn: 'Thunder Shock',
        typeId: 1,
        power: 40,
        accuracy: 100,
        pp: 30,
        priority: 0,
        description: 'でんきをまとって攻撃する',
        category: 'Special',
        target: 'selected-pokemon',
        damageClass: 'special',
        effectChance: null,
        effectChange: null,
        effectEntries: [],
        statChanges: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        type: {
          id: 1,
          name: 'でんき',
          nameEn: 'Electric',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      } as Prisma.MoveGetPayload<{
        include: {
          type: true;
        };
      }>;

      const result = MoveMapper.toDomainEntity(moveData);

      expect(result).toBeInstanceOf(Move);
      expect(result.id).toBe(1);
      expect(result.name).toBe('でんきショック');
      expect(result.nameEn).toBe('Thunder Shock');
      expect(result.type).toBeInstanceOf(Type);
      expect(result.type.name).toBe('でんき');
      expect(result.power).toBe(40);
      expect(result.accuracy).toBe(100);
      expect(result.pp).toBe(30);
      expect(result.priority).toBe(0);
      expect(result.description).toBe('でんきをまとって攻撃する');
    });
  });
});

