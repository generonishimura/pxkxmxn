import { RattledEffect } from './rattled-effect';
import { AbilityRegistry } from '../../ability-registry';
import { HitResult } from '../../../battle-events/hit-result';
import { applyStatChanges } from '../../../battle-events/stat-change';
import { IntimidateEffect } from './intimidate-effect';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe('RattledEffect（びびり）', () => {
  const hit = (moveTypeName: string): HitResult => ({
    damage: 30,
    hpBefore: 100,
    hitIndex: 0,
    hitCount: 1,
    isContact: true,
    moveTypeName,
    moveCategory: 'Physical',
    targetFainted: false,
  });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  describe('onDamagingHit', () => {
    it.each([['むし'], ['ゴースト'], ['あく']])(
      '%sタイプの技でダメージを受けると、素早さを1段階上げる',
      async typeName => {
        // Arrange
        const { context, get } = createInMemoryBattle(
          {},
          { ability: 'びびり', status: { currentHp: 70 } },
        );

        // Act
        const message = await new RattledEffect().onDamagingHit(
          get(2),
          get(1),
          hit(typeName),
          context(),
        );

        // Assert
        expect(get(2).speedRank).toBe(1);
        expect(message).toBe('Speed rose!');
      },
    );

    it('むし・ゴースト・あく以外の技では、素早さを上げない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {},
        { ability: 'びびり', status: { currentHp: 70 } },
      );

      // Act
      const message = await new RattledEffect().onDamagingHit(
        get(2),
        get(1),
        hit('ノーマル'),
        context(),
      );

      // Assert
      expect(get(2).speedRank).toBe(0);
      expect(message).toBeNull();
    });

    it('ひんしになったら、素早さを上げない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {},
        { ability: 'びびり', status: { currentHp: 0 } },
      );

      // Act
      const message = await new RattledEffect().onDamagingHit(
        get(2),
        get(1),
        { ...hit('あく'), targetFainted: true },
        context(),
      );

      // Assert
      expect(get(2).speedRank).toBe(0);
      expect(message).toBeNull();
    });
  });

  describe('onStatChanged（いかく）', () => {
    it('いかくで攻撃が下がると、素早さを1段階上げる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({ ability: 'いかく' }, { ability: 'びびり' });

      // Act
      const result = await applyStatChanges(
        get(2),
        [{ statType: 'attack', rankChange: -1 }],
        context(),
        { source: { pokemon: get(1), abilityName: 'いかく', kind: 'ability', name: 'いかく' } },
      );

      // Assert
      expect(get(2).attackRank).toBe(-1);
      expect(get(2).speedRank).toBe(1);
      expect(result.messages).toEqual(['Speed rose!']);
    });

    it('相手のいかく（場に出たとき）で攻撃が下がると、素早さも上がる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({ ability: 'いかく' }, { ability: 'びびり' });

      // Act
      await new IntimidateEffect().onEntry(get(1), context());

      // Assert
      expect(get(2).attackRank).toBe(-1);
      expect(get(2).speedRank).toBe(1);
    });

    it('攻撃ランクが-6でいかくの低下が起きなければ、素早さを上げない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'いかく' },
        { ability: 'びびり', status: { attackRank: -6 } },
      );

      // Act
      await applyStatChanges(get(2), [{ statType: 'attack', rankChange: -1 }], context(), {
        source: { pokemon: get(1), abilityName: 'いかく', kind: 'ability', name: 'いかく' },
      });

      // Assert
      expect(get(2).speedRank).toBe(0);
    });

    it('いかく以外で攻撃が下がっても、素早さを上げない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({}, { ability: 'びびり' });

      // Act
      await applyStatChanges(get(2), [{ statType: 'attack', rankChange: -1 }], context(), {
        source: { pokemon: get(1), kind: 'move', name: 'なきごえ' },
      });

      // Assert
      expect(get(2).attackRank).toBe(-1);
      expect(get(2).speedRank).toBe(0);
    });
  });
});
