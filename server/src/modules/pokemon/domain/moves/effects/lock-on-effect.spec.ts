import { MoveRegistry } from '../move-registry';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { LockOnEffect } from './lock-on-effect';

describe('LockOnEffect（こころのめ・ロックオン）', () => {
  describe('onUse', () => {
    it('使用者に lockOnTurns: 2 を書き、ねらいを定めたメッセージを返す', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle();
      const effect = new LockOnEffect();

      // Act
      const result = await effect.onUse(get(1), get(2), context({ moveName: 'ロックオン' }));

      // Assert
      expect(get(1).volatileState.lockOnTurns).toBe(2);
      expect(get(2).volatileState.lockOnTurns).toBeUndefined();
      expect(result).toBe('took aim at the target!');
    });

    it('使用者がすでにねらいを定めていれば失敗し、残りターン数を変えない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({
        status: { volatileState: { lockOnTurns: 1 } },
      });
      const effect = new LockOnEffect();

      // Act
      const result = await effect.onUse(get(1), get(2), context({ moveName: 'こころのめ' }));

      // Assert
      expect(get(1).volatileState.lockOnTurns).toBe(1);
      expect(result).toBe('But it failed');
    });
  });

  describe('登録', () => {
    it.each(['こころのめ', 'ロックオン'])(
      '「%s」は LockOnEffect として登録されている',
      moveName => {
        // Arrange
        MoveRegistry.clear();
        MoveRegistry.initialize();

        // Act
        const effect = MoveRegistry.get(moveName);

        // Assert
        expect(effect).toBeInstanceOf(LockOnEffect);
      },
    );
  });
});
