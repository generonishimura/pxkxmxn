import { GuardDogEffect } from './guard-dog-effect';
import { IntimidateEffect } from './intimidate-effect';
import { AbilityRegistry } from '../../ability-registry';
import { applyStatChanges } from '../../../battle-events/stat-change';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe('GuardDogEffect（ばんけん）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  describe('modifyIncomingStatChange', () => {
    it('いかくによる攻撃の低下を+1にする', () => {
      // Arrange
      const { get } = createInMemoryBattle();

      // Act
      const result = new GuardDogEffect().modifyIncomingStatChange(
        get(1),
        { statType: 'attack', rankChange: -1 },
        { kind: 'ability', name: 'いかく', pokemon: get(2) },
      );

      // Assert
      expect(result).toBe(1);
    });

    it('いかく以外による攻撃の低下（なきごえ）は変えない', () => {
      // Arrange
      const { get } = createInMemoryBattle();

      // Act
      const result = new GuardDogEffect().modifyIncomingStatChange(
        get(1),
        { statType: 'attack', rankChange: -1 },
        { kind: 'move', name: 'なきごえ', pokemon: get(2) },
      );

      // Assert
      expect(result).toBeUndefined();
    });

    it('原因がわからない変化は変えない', () => {
      // Arrange
      const { get } = createInMemoryBattle();

      // Act
      const result = new GuardDogEffect().modifyIncomingStatChange(
        get(1),
        { statType: 'attack', rankChange: -1 },
        undefined,
      );

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('applyStatChanges との組み合わせ', () => {
    it('いかくを受けると攻撃が1段階上がる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({ ability: 'ばんけん' }, { ability: 'いかく' });

      // Act
      const result = await applyStatChanges(
        get(1),
        [{ statType: 'attack', rankChange: -1 }],
        context(),
        { source: { kind: 'ability', name: 'いかく', pokemon: get(2) } },
      );

      // Assert
      expect(result.applied).toEqual([{ statType: 'attack', rankChange: 1 }]);
      expect(get(1).attackRank).toBe(1);
    });

    it('相手のいかくが場に出たとき（onEntry）に、攻撃が1段階上がる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({ ability: 'ばんけん' }, { ability: 'いかく' });

      // Act
      await new IntimidateEffect().onEntry(get(2), context());

      // Assert
      expect(get(1).attackRank).toBe(1);
    });

    it('相手の技による攻撃の低下（なきごえ）はそのまま受ける', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({ ability: 'ばんけん' });

      // Act
      await applyStatChanges(get(1), [{ statType: 'attack', rankChange: -1 }], context(), {
        source: { kind: 'move', name: 'なきごえ', pokemon: get(2) },
      });

      // Assert
      expect(get(1).attackRank).toBe(-1);
    });
  });
});
