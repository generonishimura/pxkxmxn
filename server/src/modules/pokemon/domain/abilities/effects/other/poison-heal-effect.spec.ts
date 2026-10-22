import { PoisonHealEffect } from './poison-heal-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe('PoisonHealEffect（ポイズンヒール）', () => {
  describe('modifyStatusDamage', () => {
    it.each([StatusCondition.Poison, StatusCondition.BadPoison])(
      '%s のダメージを受けずに、最大HPの1/8を回復する',
      async status => {
        // Arrange
        const { context, get } = createInMemoryBattle({
          ability: 'ポイズンヒール',
          status: { currentHp: 50, statusCondition: status },
        });

        // Act
        const damage = await new PoisonHealEffect().modifyStatusDamage(
          get(1),
          status,
          12,
          context(),
        );

        // Assert
        expect(damage).toBe(0);
        expect(get(1).currentHp).toBe(62);
      },
    );

    it('かいふくふうじ中は回復しないが、どくのダメージも受けない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({
        status: {
          currentHp: 50,
          statusCondition: StatusCondition.Poison,
          volatileState: { healBlockTurns: 2 },
        },
      });

      // Act
      const damage = await new PoisonHealEffect().modifyStatusDamage(
        get(1),
        StatusCondition.Poison,
        12,
        context(),
      );

      // Assert
      expect(damage).toBe(0);
      expect(get(1).currentHp).toBe(50);
    });

    it('回復量は切り捨てで、最低1回復する', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({
        status: { currentHp: 3, maxHp: 7, statusCondition: StatusCondition.Poison },
      });

      // Act
      const damage = await new PoisonHealEffect().modifyStatusDamage(
        get(1),
        StatusCondition.Poison,
        1,
        context(),
      );

      // Assert
      expect(damage).toBe(0);
      expect(get(1).currentHp).toBe(4);
    });

    it('最大HPを超えて回復しない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({
        status: { currentHp: 95, statusCondition: StatusCondition.Poison },
      });

      // Act
      await new PoisonHealEffect().modifyStatusDamage(
        get(1),
        StatusCondition.Poison,
        12,
        context(),
      );

      // Assert
      expect(get(1).currentHp).toBe(100);
    });

    it('HPが満タンなら回復せず、ダメージも受けない', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle({
        status: { statusCondition: StatusCondition.Poison },
      });

      // Act
      const damage = await new PoisonHealEffect().modifyStatusDamage(
        get(1),
        StatusCondition.Poison,
        12,
        context(),
      );

      // Assert
      expect(damage).toBe(0);
      expect(battleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('やけどのダメージは変えない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({
        status: { currentHp: 50, statusCondition: StatusCondition.Burn },
      });

      // Act
      const damage = await new PoisonHealEffect().modifyStatusDamage(
        get(1),
        StatusCondition.Burn,
        6,
        context(),
      );

      // Assert
      expect(damage).toBeUndefined();
      expect(get(1).currentHp).toBe(50);
    });
  });
});
