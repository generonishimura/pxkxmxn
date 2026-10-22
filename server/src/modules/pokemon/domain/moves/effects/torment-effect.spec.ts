import { MoveRegistry } from '../move-registry';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { TormentEffect } from './torment-effect';

describe('TormentEffect（いちゃもん）', () => {
  describe('onUse', () => {
    it('相手に torment を書き、いちゃもんをつけたメッセージを返す', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle();
      const effect = new TormentEffect();

      // Act
      const result = await effect.onUse(get(1), get(2), context({ moveName: 'いちゃもん' }));

      // Assert
      expect(get(2).volatileState.torment).toBe(true);
      expect(result).toBe('was subjected to torment!');
    });

    it('相手がすでにいちゃもんをつけられていれば失敗する', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle(
        {},
        { status: { volatileState: { torment: true } } },
      );
      const effect = new TormentEffect();

      // Act
      const result = await effect.onUse(get(1), get(2), context({ moveName: 'いちゃもん' }));

      // Assert
      expect(battleRepository.patchVolatileState).not.toHaveBeenCalled();
      expect(result).toBe('But it failed');
    });
  });

  describe('登録', () => {
    it('「いちゃもん」は TormentEffect として登録されている', () => {
      // Arrange
      MoveRegistry.clear();
      MoveRegistry.initialize();

      // Act
      const effect = MoveRegistry.get('いちゃもん');

      // Assert
      expect(effect).toBeInstanceOf(TormentEffect);
    });
  });
});
