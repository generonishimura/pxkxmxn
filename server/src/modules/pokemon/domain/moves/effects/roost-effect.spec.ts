import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { RoostEffect } from './roost-effect';

describe('RoostEffect（はねやすめ）', () => {
  it('最大 HP の 1/2（四捨五入）を回復し、このターンはひこうタイプを失う（roosting）', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({
      types: ['ひこう'],
      status: { currentHp: 10, maxHp: 101 },
    });

    // Act
    const message = await new RoostEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('user restored its HP!');
    expect(get(1).currentHp).toBe(61);
    expect(get(1).volatileState.roosting).toBe(true);
  });

  it('HP が満タンなら失敗し、ひこうタイプを失わない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({ types: ['ひこう'] });

    // Act
    const message = await new RoostEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('But it failed');
    expect(get(1).volatileState.roosting).toBeUndefined();
  });

  it('かいふくふうじ中は失敗し、ひこうタイプを失わない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({
      types: ['ひこう'],
      status: { currentHp: 10, volatileState: { healBlockTurns: 3 } },
    });

    // Act
    const message = await new RoostEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('But it failed');
    expect(get(1).currentHp).toBe(10);
    expect(get(1).volatileState.roosting).toBeUndefined();
  });
});
