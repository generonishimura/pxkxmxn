import { RestEffect } from './rest-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { AbilityRegistry } from '../../abilities/ability-registry';

describe('RestEffect（ねむる）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

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

  it('HP が満タンなら、失敗する', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle();

    // Act
    const message = await new RestEffect().onUse(get(1), get(2), context({ attacker: get(1) }));

    // Assert
    expect(get(1).statusCondition).toBeNull();
    expect(message).toBeNull();
  });

  it.each(['ふみん', 'やるき'])('%s のポケモンが使うと、失敗する', async ability => {
    // Arrange
    const { context, get } = createInMemoryBattle({ ability, status: { currentHp: 40 } });

    // Act
    const message = await new RestEffect().onUse(get(1), get(2), context({ attacker: get(1) }));

    // Assert
    expect(get(1).currentHp).toBe(40);
    expect(get(1).statusCondition).toBeNull();
    expect(message).toBeNull();
  });

  it('場の誰かがさわいでいると、失敗する', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      { status: { currentHp: 40 } },
      { status: { volatileState: { uproar: true } } },
    );

    // Act
    const message = await new RestEffect().onUse(
      get(1),
      get(2),
      context({ attacker: get(1), defender: get(2) }),
    );

    // Assert
    expect(get(1).currentHp).toBe(40);
    expect(get(1).statusCondition).toBeNull();
    expect(message).toBeNull();
  });

  it('ほかの状態異常（やけど）があっても、ねむりに上書きして HP を全回復する', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({
      status: { currentHp: 40, statusCondition: StatusCondition.Burn },
    });

    // Act
    const message = await new RestEffect().onUse(get(1), get(2), context({ attacker: get(1) }));

    // Assert
    expect(get(1).currentHp).toBe(100);
    expect(get(1).statusCondition).toBe(StatusCondition.Sleep);
    expect(message).toBe('user slept and recovered HP!');
  });
});
