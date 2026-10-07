import { SnatchEffect } from './snatch-effect';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';

describe('SnatchEffect（よこどり）', () => {
  it('このターンの間、相手の奪える変化技を待ち構える（snatch を書く）', async () => {
    // Arrange
    const { get, context } = createInMemoryBattle();

    // Act
    const message = await new SnatchEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('waits for a target to make a move!');
    expect(get(1).volatileState.snatch).toBe(true);
  });

  it('すでに待ち構えていれば失敗する', async () => {
    // Arrange
    const { get, context } = createInMemoryBattle({ status: { volatileState: { snatch: true } } });

    // Act
    const message = await new SnatchEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('But it failed');
  });
});
