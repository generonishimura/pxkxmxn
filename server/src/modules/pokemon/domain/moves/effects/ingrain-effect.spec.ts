import { IngrainEffect } from './ingrain-effect';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';

describe('IngrainEffect（ねをはる）', () => {
  const effect = new IngrainEffect();

  describe('shouldFail', () => {
    it('すでに根を張っていれば失敗する', () => {
      // Arrange
      const { context, get } = createInMemoryBattle({
        status: { volatileState: { ingrain: true } },
      });

      // Act
      const result = effect.shouldFail(get(1), get(2), context());

      // Assert
      expect(result).toBe(true);
    });

    it('根を張っていなければ失敗しない', () => {
      // Arrange
      const { context, get } = createInMemoryBattle();

      // Act
      const result = effect.shouldFail(get(1), get(2), context());

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('onUse', () => {
    it('使用者が根を張り、相手には何も書かない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle();

      // Act
      const message = await effect.onUse(get(1), get(2), context({ moveName: 'ねをはる' }));

      // Assert
      expect(message).toBe('planted its roots!');
      expect(get(1).volatileState.ingrain).toBe(true);
      expect(get(2).volatileState.ingrain).toBeUndefined();
    });
  });
});
