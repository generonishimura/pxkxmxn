import { ContraryEffect } from './contrary-effect';
import { AbilityRegistry } from '../../ability-registry';
import { MoldBreakerEffect } from '../mold-breaker-effect';
import { applyStatChanges } from '../../../battle-events/stat-change';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe('ContraryEffect（あまのじゃく）', () => {
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
      [1, -1],
      [2, -2],
      [-1, 1],
      [-2, 2],
    ])('変化量 %i を %i にする', (rankChange, expected) => {
      // Arrange
      const { get } = createInMemoryBattle();

      // Act
      const result = new ContraryEffect().modifyIncomingStatChange(
        get(1),
        { statType: 'specialAttack', rankChange },
        undefined,
      );

      // Assert
      expect(result).toBe(expected);
    });
  });

  describe('applyStatChanges との組み合わせ', () => {
    it('自分で下げたランク（リーフストーム）が上がる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({ ability: 'あまのじゃく' });

      // Act
      const result = await applyStatChanges(
        get(1),
        [{ statType: 'specialAttack', rankChange: -2 }],
        context(),
        { source: { kind: 'move', name: 'リーフストーム', pokemon: get(1) } },
      );

      // Assert
      expect(result.applied).toEqual([{ statType: 'specialAttack', rankChange: 2 }]);
      expect(get(1).specialAttackRank).toBe(2);
    });

    it('相手に下げられたランク（いかく）が上がる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'あまのじゃく' },
        { ability: 'いかく' },
      );

      // Act
      await applyStatChanges(get(1), [{ statType: 'attack', rankChange: -1 }], context(), {
        source: { kind: 'ability', name: 'いかく', pokemon: get(2) },
      });

      // Assert
      expect(get(1).attackRank).toBe(1);
    });

    it('自分で上げたランクは下がり、下げたランクは上がる（からをやぶる）', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({ ability: 'あまのじゃく' });

      // Act
      await applyStatChanges(
        get(1),
        [
          { statType: 'attack', rankChange: 2 },
          { statType: 'defense', rankChange: -1 },
        ],
        context(),
        { source: { kind: 'move', name: 'からをやぶる', pokemon: get(1) } },
      );

      // Assert
      expect(get(1).attackRank).toBe(-2);
      expect(get(1).defenseRank).toBe(1);
    });

    it('相手の技による変化は、使い手のかたやぶりで無視される', async () => {
      // Arrange
      AbilityRegistry.register('かたやぶり', new MoldBreakerEffect());
      const { context, get } = createInMemoryBattle(
        { ability: 'あまのじゃく' },
        { ability: 'かたやぶり' },
      );

      // Act
      await applyStatChanges(get(1), [{ statType: 'attack', rankChange: -1 }], context(), {
        source: { kind: 'move', name: 'なきごえ', pokemon: get(2) },
      });

      // Assert
      expect(get(1).attackRank).toBe(-1);
    });
  });
});
