import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { SubstituteEffect } from './substitute-effect';

describe('SubstituteEffect（みがわり）', () => {
  it('最大 HP の 1/4（切り捨て）を払い、同じ HP のみがわりを書く', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({
      status: { currentHp: 101, maxHp: 101 },
    });

    // Act
    const message = await new SubstituteEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('The user created a substitute!');
    expect(get(1).currentHp).toBe(76);
    expect(get(1).volatileState.substituteHp).toBe(25);
  });

  it('HP が最大 HP の 1/4 以下なら失敗し、HP は減らない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({
      status: { currentHp: 25, maxHp: 101 },
    });

    // Act
    const message = await new SubstituteEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('But it failed');
    expect(get(1).currentHp).toBe(25);
    expect(get(1).volatileState.substituteHp).toBeUndefined();
  });

  it('最大 HP が 1 なら失敗する', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({
      status: { currentHp: 1, maxHp: 1 },
    });

    // Act
    const message = await new SubstituteEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('But it failed');
    expect(get(1).volatileState.substituteHp).toBeUndefined();
  });

  it('すでにみがわりがあれば失敗する', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({
      status: { volatileState: { substituteHp: 10 } },
    });

    // Act
    const message = await new SubstituteEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('But it failed');
    expect(get(1).currentHp).toBe(100);
    expect(get(1).volatileState.substituteHp).toBe(10);
  });
});
