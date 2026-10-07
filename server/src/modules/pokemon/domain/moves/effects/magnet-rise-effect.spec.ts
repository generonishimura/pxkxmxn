import { MagnetRiseEffect } from './magnet-rise-effect';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';

describe('MagnetRiseEffect（でんじふゆう）', () => {
  const effect = new MagnetRiseEffect();

  describe('shouldFail', () => {
    it('すでにでんじふゆうで浮いていれば失敗する', () => {
      // Arrange
      const { context, get } = createInMemoryBattle({
        status: { volatileState: { magnetRiseTurns: 2 } },
      });

      // Act
      const result = effect.shouldFail(get(1), get(2), context());

      // Assert
      expect(result).toBe(true);
    });

    it('ねをはるで根を張っていれば失敗する', () => {
      // Arrange
      const { context, get } = createInMemoryBattle({
        status: { volatileState: { ingrain: true } },
      });

      // Act
      const result = effect.shouldFail(get(1), get(2), context());

      // Assert
      expect(result).toBe(true);
    });

    it('浮いても根を張ってもいなければ失敗しない', () => {
      // Arrange
      const { context, get } = createInMemoryBattle();

      // Act
      const result = effect.shouldFail(get(1), get(2), context());

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('onUse', () => {
    it('使用者を 5 ターン浮かせ、相手には何も書かない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle();

      // Act
      const message = await effect.onUse(get(1), get(2), context({ moveName: 'でんじふゆう' }));

      // Assert
      expect(message).toBe('levitated with electromagnetism!');
      expect(get(1).volatileState.magnetRiseTurns).toBe(5);
      expect(get(2).volatileState.magnetRiseTurns).toBeUndefined();
    });
  });
});
