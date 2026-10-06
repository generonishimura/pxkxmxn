import { RestEffect } from './rest-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';

describe('RestEffect（ねむる）', () => {
  it('HP を全回復して、ねむりになる', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({ status: { currentHp: 40 } });

    // Act
    const message = await new RestEffect().onUse(get(1), get(2), context({ attacker: get(1) }));

    // Assert
    expect(get(1).currentHp).toBe(100);
    expect(get(1).statusCondition).toBe(StatusCondition.Sleep);
    expect(message).toBe('user slept and recovered HP!');
  });

  it('すでにねむっていれば、HP が減っていても失敗する', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({
      status: { currentHp: 40, statusCondition: StatusCondition.Sleep },
    });

    // Act
    const message = await new RestEffect().onUse(get(1), get(2), context({ attacker: get(1) }));

    // Assert
    expect(get(1).currentHp).toBe(40);
    expect(message).toBeNull();
  });

  it('ぜったいねむりのポケモンが使うと、失敗する', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({ status: { currentHp: 40 } });
    const ctx = context({ attacker: get(1), attackerEffectiveStatus: StatusCondition.Sleep });

    // Act
    const message = await new RestEffect().onUse(get(1), get(2), ctx);

    // Assert
    expect(get(1).currentHp).toBe(40);
    expect(get(1).statusCondition).toBeNull();
    expect(message).toBeNull();
  });
});
