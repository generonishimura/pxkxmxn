import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { LeechSeedEffect } from './leech-seed-effect';

describe('LeechSeedEffect（やどりぎのタネ）', () => {
  it('相手にやどりぎのタネを植える', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle();
    const effect = new LeechSeedEffect();

    // Act
    const message = await effect.onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('was seeded!');
    expect(get(2).volatileState.leechSeed).toBe(true);
  });

  it('くさタイプの相手には失敗する', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({}, { types: ['くさ', 'どく'] });
    const effect = new LeechSeedEffect();

    // Act
    const message = await effect.onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('But it failed');
    expect(get(2).volatileState.leechSeed).toBeUndefined();
  });

  it('すでに植えられている相手には失敗する', async () => {
    // Arrange
    const { context, get, battleRepository } = createInMemoryBattle(
      {},
      { status: { volatileState: { leechSeed: true } } },
    );
    const effect = new LeechSeedEffect();

    // Act
    const message = await effect.onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('But it failed');
    expect(battleRepository.patchVolatileState).not.toHaveBeenCalled();
  });
});
