import { MoveRegistry } from '../move-registry';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { ImprisonEffect } from './imprison-effect';

describe('ImprisonEffect（ふういん）', () => {
  describe('onUse', () => {
    it('使用者に imprison を書き、相手には書かない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle();
      const effect = new ImprisonEffect();

      // Act
      const result = await effect.onUse(get(1), get(2), context({ moveName: 'ふういん' }));

      // Assert
      expect(get(1).volatileState.imprison).toBe(true);
      expect(get(2).volatileState.imprison).toBeUndefined();
      expect(result).toBe('sealed any moves its target shares with it!');
    });

    it('使用者がすでにふういんを使っていれば失敗する', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle({
        status: { volatileState: { imprison: true } },
      });
      const effect = new ImprisonEffect();

      // Act
      const result = await effect.onUse(get(1), get(2), context({ moveName: 'ふういん' }));

      // Assert
      expect(battleRepository.patchVolatileState).not.toHaveBeenCalled();
      expect(result).toBe('But it failed');
    });
  });

  describe('登録', () => {
    it('「ふういん」は ImprisonEffect として登録されている', () => {
      // Arrange
      MoveRegistry.clear();
      MoveRegistry.initialize();

      // Act
      const effect = MoveRegistry.get('ふういん');

      // Assert
      expect(effect).toBeInstanceOf(ImprisonEffect);
    });
  });
});
