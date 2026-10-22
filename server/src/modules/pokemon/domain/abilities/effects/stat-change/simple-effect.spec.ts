import { SimpleEffect } from './simple-effect';
import { AbilityRegistry } from '../../ability-registry';
import { MoldBreakerEffect } from '../mold-breaker-effect';
import { applyStatChanges } from '../../../battle-events/stat-change';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe('SimpleEffect（たんじゅん）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  describe('modifyIncomingStatChange', () => {
    it.each([
      [1, 2],
      [2, 4],
      [-1, -2],
      [-2, -4],
    ])('変化量 %i を %i にする', (rankChange, expected) => {
      // Arrange
      const { get } = createInMemoryBattle();

      // Act
      const result = new SimpleEffect().modifyIncomingStatChange(
        get(1),
        { statType: 'attack', rankChange },
        undefined,
      );

      // Assert
      expect(result).toBe(expected);
    });
  });

  describe('applyStatChanges との組み合わせ', () => {
    it('自分で上げたランク（つるぎのまい）が2倍になる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({ ability: 'たんじゅん' });

      // Act
      const result = await applyStatChanges(
        get(1),
        [{ statType: 'attack', rankChange: 2 }],
        context(),
        { source: { kind: 'move', name: 'つるぎのまい', pokemon: get(1) } },
      );

      // Assert
      expect(result.applied).toEqual([{ statType: 'attack', rankChange: 4 }]);
      expect(get(1).attackRank).toBe(4);
    });

    it('相手に下げられたランク（いかく）も2倍になる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'たんじゅん' },
        { ability: 'いかく' },
      );

      // Act
      await applyStatChanges(get(1), [{ statType: 'attack', rankChange: -1 }], context(), {
        source: { kind: 'ability', name: 'いかく', pokemon: get(2) },
      });

      // Assert
      expect(get(1).attackRank).toBe(-2);
    });

    it('2倍にしても+6を超えない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({
        ability: 'たんじゅん',
        status: { speedRank: 5 },
      });

      // Act
      const result = await applyStatChanges(
        get(1),
        [{ statType: 'speed', rankChange: 1 }],
        context(),
        { source: { kind: 'move', name: 'ニトロチャージ', pokemon: get(1) } },
      );

      // Assert
      expect(result.applied).toEqual([{ statType: 'speed', rankChange: 1 }]);
      expect(get(1).speedRank).toBe(6);
    });

    it('相手の技による変化は、使い手のかたやぶりで無視される', async () => {
      // Arrange
      AbilityRegistry.register('かたやぶり', new MoldBreakerEffect());
      const { context, get } = createInMemoryBattle(
        { ability: 'たんじゅん' },
        { ability: 'かたやぶり' },
      );

      // Act
      await applyStatChanges(get(1), [{ statType: 'defense', rankChange: -1 }], context(), {
        source: { kind: 'move', name: 'しっぽをふる', pokemon: get(2) },
      });

      // Assert
      expect(get(1).defenseRank).toBe(-1);
    });
  });
});
