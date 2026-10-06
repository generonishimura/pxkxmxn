import { MirrorArmorEffect } from './mirror-armor-effect';
import { IntimidateEffect } from './intimidate-effect';
import { AbilityRegistry } from '../../ability-registry';
import { MoldBreakerEffect } from '../mold-breaker-effect';
import { applyStatChanges } from '../../../battle-events/stat-change';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe('MirrorArmorEffect（ミラーアーマー）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('相手の低下を跳ね返す特性である', () => {
    // Arrange
    const effect = new MirrorArmorEffect();

    // Act
    const reflects = effect.reflectsStatDrops;

    // Assert
    expect(reflects).toBe(true);
  });

  describe('applyStatChanges との組み合わせ', () => {
    it('いかくの攻撃低下を受けず、相手の攻撃を下げる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'ミラーアーマー' },
        { ability: 'いかく' },
      );

      // Act
      const result = await applyStatChanges(
        get(1),
        [{ statType: 'attack', rankChange: -1 }],
        context(),
        { source: { kind: 'ability', name: 'いかく', pokemon: get(2) } },
      );

      // Assert
      expect(get(1).attackRank).toBe(0);
      expect(get(2).attackRank).toBe(-1);
      expect(result.messages).toEqual(['ミラーアーマー reflected the stat drop!', 'Attack fell!']);
    });

    it('相手のいかくが場に出たとき（onEntry）に、いかくの持ち主の攻撃を下げる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'ミラーアーマー' },
        { ability: 'いかく' },
      );

      // Act
      await new IntimidateEffect().onEntry(get(2), context());

      // Assert
      expect(get(1).attackRank).toBe(0);
      expect(get(2).attackRank).toBe(-1);
    });

    it('相手の技による低下（いやなおと）を跳ね返す', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({ ability: 'ミラーアーマー' });

      // Act
      await applyStatChanges(get(1), [{ statType: 'defense', rankChange: -2 }], context(), {
        source: { kind: 'move', name: 'いやなおと', pokemon: get(2) },
      });

      // Assert
      expect(get(1).defenseRank).toBe(0);
      expect(get(2).defenseRank).toBe(-2);
    });

    it('自分の技による低下（インファイト）は跳ね返さない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({ ability: 'ミラーアーマー' });

      // Act
      await applyStatChanges(
        get(1),
        [
          { statType: 'defense', rankChange: -1 },
          { statType: 'specialDefense', rankChange: -1 },
        ],
        context(),
        { source: { kind: 'move', name: 'インファイト', pokemon: get(1) } },
      );

      // Assert
      expect(get(1).defenseRank).toBe(-1);
      expect(get(1).specialDefenseRank).toBe(-1);
      expect(get(2).defenseRank).toBe(0);
    });

    it('相手の技による低下は、使い手のかたやぶりで跳ね返せない', async () => {
      // Arrange
      AbilityRegistry.register('かたやぶり', new MoldBreakerEffect());
      const { context, get } = createInMemoryBattle(
        { ability: 'ミラーアーマー' },
        { ability: 'かたやぶり' },
      );

      // Act
      await applyStatChanges(get(1), [{ statType: 'attack', rankChange: -1 }], context(), {
        source: { kind: 'move', name: 'なきごえ', pokemon: get(2) },
      });

      // Assert
      expect(get(1).attackRank).toBe(-1);
      expect(get(2).attackRank).toBe(0);
    });
  });
});
