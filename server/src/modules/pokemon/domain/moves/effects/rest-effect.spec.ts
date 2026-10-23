import { RestEffect } from './rest-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { AbilityRegistry } from '../../abilities/ability-registry';
import { Field } from '@/modules/battle/domain/entities/battle.entity';

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

  it('3ターン眠る（persistentState.sleepTurns に 3 を書く）', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({ status: { currentHp: 40 } });

    // Act
    await new RestEffect().onUse(get(1), get(2), context({ attacker: get(1) }));

    // Assert
    expect(get(1).persistentState.sleepTurns).toBe(3);
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
    expect(message).toBe('But it failed');
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
    expect(message).toBe('But it failed');
  });

  it('HP が満タンなら、失敗する', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle();

    // Act
    const message = await new RestEffect().onUse(get(1), get(2), context({ attacker: get(1) }));

    // Assert
    expect(get(1).statusCondition).toBeNull();
    expect(message).toBe('But it failed');
  });

  it.each(['ふみん', 'やるき'])('%s のポケモンが使うと、失敗する', async ability => {
    // Arrange
    const { context, get } = createInMemoryBattle({ ability, status: { currentHp: 40 } });

    // Act
    const message = await new RestEffect().onUse(get(1), get(2), context({ attacker: get(1) }));

    // Assert
    expect(get(1).currentHp).toBe(40);
    expect(get(1).statusCondition).toBeNull();
    expect(message).toBe('But it failed');
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
    expect(message).toBe('But it failed');
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

  describe('フィールド', () => {
    it.each([Field.ElectricTerrain, Field.MistyTerrain])(
      '地面にいるポケモンが %s で使うと、失敗する',
      async field => {
        // Arrange
        const { context, get, battleRepository } = createInMemoryBattle({
          status: { currentHp: 40 },
        });
        await battleRepository.update(1, { field });

        // Act
        const message = await new RestEffect().onUse(get(1), get(2), context({ attacker: get(1) }));

        // Assert
        expect(get(1).currentHp).toBe(40);
        expect(get(1).statusCondition).toBeNull();
        expect(message).toBe('But it failed');
      },
    );

    it('ひこうタイプ（地面にいない）なら、エレキフィールドでも成功する', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle({
        types: ['ひこう'],
        status: { currentHp: 40 },
      });
      await battleRepository.update(1, { field: Field.ElectricTerrain });

      // Act
      const message = await new RestEffect().onUse(get(1), get(2), context({ attacker: get(1) }));

      // Assert
      expect(get(1).statusCondition).toBe(StatusCondition.Sleep);
      expect(message).toBe('user slept and recovered HP!');
    });

    it('グラスフィールドでは、地面にいても成功する', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle({
        status: { currentHp: 40 },
      });
      await battleRepository.update(1, { field: Field.GrassyTerrain });

      // Act
      const message = await new RestEffect().onUse(get(1), get(2), context({ attacker: get(1) }));

      // Assert
      expect(get(1).statusCondition).toBe(StatusCondition.Sleep);
      expect(message).toBe('user slept and recovered HP!');
    });
  });
});
