import { AbilityMapper } from './ability.mapper';
import { Ability } from '@/modules/pokemon/domain/entities/ability.entity';
import { Prisma } from '@generated/prisma/client';

describe('AbilityMapper', () => {
  describe('toDomainEntity', () => {
    it('should convert Prisma Ability data to domain entity', () => {
      const abilityData: Prisma.AbilityGetPayload<{}> = {
        id: 1,
        name: 'せいでんき',
        nameEn: 'Static',
        description: '接触技を受けると相手をまひ状態にすることがある',
        triggerEvent: 'OnEntry',
        effectCategory: 'StatusCondition',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = AbilityMapper.toDomainEntity(abilityData);

      expect(result).toBeInstanceOf(Ability);
      expect(result.id).toBe(1);
      expect(result.name).toBe('せいでんき');
      expect(result.nameEn).toBe('Static');
      expect(result.description).toBe('接触技を受けると相手をまひ状態にすることがある');
      expect(result.triggerEvent).toBe('OnEntry');
      expect(result.effectCategory).toBe('StatusCondition');
    });
  });
});

