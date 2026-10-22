import { WishEffect } from './wish-effect';
import { getSideConditions } from '@/modules/battle/domain/state/side-state';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';

describe('WishEffect（ねがいごと）', () => {
  describe('onUse', () => {
    it('自分の陣営に、次のターンの終わりに最大HPの半分（切り捨て）を回復するねがいごとを置く', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({ status: { currentHp: 50, maxHp: 175 } });

      // Act
      const message = await new WishEffect().onUse(get(1), get(2), context());

      // Assert
      expect(message).toBe('made a wish!');
      const sideState = context().battle.sideState;
      expect(getSideConditions(sideState, 1).wish).toEqual({ turns: 2, healAmount: 87 });
      expect(getSideConditions(sideState, 2).wish).toBeUndefined();
    });
  });

  describe('shouldFail', () => {
    it('自分の陣営にねがいごとがなければ失敗しない', () => {
      // Arrange
      const { context, get } = createInMemoryBattle();

      // Act
      const failed = new WishEffect().shouldFail(get(1), get(2), context());

      // Assert
      expect(failed).toBe(false);
    });

    it('自分の陣営にねがいごとが残っていれば失敗する', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle();
      await battleRepository.patchSideConditions(1, 1, { wish: { turns: 1, healAmount: 50 } });

      // Act
      const failed = new WishEffect().shouldFail(get(1), get(2), context());

      // Assert
      expect(failed).toBe(true);
    });

    it('相手の陣営のねがいごとでは失敗しない', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle();
      await battleRepository.patchSideConditions(1, 2, { wish: { turns: 1, healAmount: 50 } });

      // Act
      const failed = new WishEffect().shouldFail(get(1), get(2), context());

      // Assert
      expect(failed).toBe(false);
    });
  });
});
