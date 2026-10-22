import { HealBlockEffect } from './heal-block-effect';
import { AbilityRegistry } from '../../abilities/ability-registry';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';

describe('HealBlockEffect（かいふくふうじ）', () => {
  const effect = new HealBlockEffect();

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  describe('shouldFail', () => {
    it('相手がすでにかいふくふうじされていれば失敗する', () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {},
        { status: { volatileState: { healBlockTurns: 3 } } },
      );

      // Act
      const result = effect.shouldFail(get(1), get(2), context());

      // Assert
      expect(result).toBe(true);
    });

    it('相手がかいふくふうじされていなければ失敗しない', () => {
      // Arrange
      const { context, get } = createInMemoryBattle();

      // Act
      const result = effect.shouldFail(get(1), get(2), context());

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('onUse', () => {
    it('相手をかいふくふうじにし、残りターン数を 5 にする', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle();

      // Act
      const message = await effect.onUse(get(1), get(2), context({ moveName: 'かいふくふうじ' }));

      // Assert
      expect(message).toBe('was prevented from healing!');
      expect(get(2).volatileState.healBlockTurns).toBe(5);
    });

    it('相手の特性が受け付けなければ失敗する', async () => {
      // Arrange
      AbilityRegistry.register('テストアロマベール', {
        canReceiveVolatile: (_holder, kind) => (kind === 'healBlock' ? false : undefined),
      });
      const { context, get } = createInMemoryBattle({}, { ability: 'テストアロマベール' });

      // Act
      const message = await effect.onUse(get(1), get(2), context({ moveName: 'かいふくふうじ' }));

      // Assert
      expect(message).toBe('but it failed');
      expect(get(2).volatileState.healBlockTurns).toBeUndefined();
    });
  });
});
