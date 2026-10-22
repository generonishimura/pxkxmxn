import { AquaRingEffect } from './aqua-ring-effect';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';

describe('AquaRingEffect（アクアリング）', () => {
  const effect = new AquaRingEffect();

  describe('shouldFail', () => {
    it('すでにアクアリングをまとっていれば失敗する', () => {
      // Arrange
      const { context, get } = createInMemoryBattle({
        status: { volatileState: { aquaRing: true } },
      });

      // Act
      const result = effect.shouldFail(get(1), get(2), context());

      // Assert
      expect(result).toBe(true);
    });

    it('アクアリングをまとっていなければ失敗しない', () => {
      // Arrange
      const { context, get } = createInMemoryBattle();

      // Act
      const result = effect.shouldFail(get(1), get(2), context());

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('onUse', () => {
    it('使用者がアクアリングをまとい、相手には何も書かない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle();

      // Act
      const message = await effect.onUse(get(1), get(2), context({ moveName: 'アクアリング' }));

      // Assert
      expect(message).toBe('surrounded itself with a veil of water!');
      expect(get(1).volatileState.aquaRing).toBe(true);
      expect(get(2).volatileState.aquaRing).toBeUndefined();
    });
  });
});
