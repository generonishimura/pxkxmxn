import { SuperLuckEffect } from './super-luck-effect';
import { AbilityRegistry } from '../../ability-registry';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe('SuperLuckEffect（きょううん）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('きょううん として登録されている', () => {
    // Arrange & Act
    const effect = AbilityRegistry.get('きょううん');

    // Assert
    expect(effect).toBeInstanceOf(SuperLuckEffect);
  });

  describe('modifyCritRatio', () => {
    it.each([
      [0, 1],
      [1, 2],
      [2, 3],
    ])('急所ランク %i を %i に上げる', (stage, expected) => {
      // Arrange
      const { context, get } = createInMemoryBattle({ ability: 'きょううん' }, {});

      // Act
      const result = new SuperLuckEffect().modifyCritRatio(get(1), stage, context());

      // Assert
      expect(result).toBe(expected);
    });
  });
});
