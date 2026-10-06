import { OpportunistEffect } from './opportunist-effect';
import { AbilityRegistry } from '../../ability-registry';
import { applyStatChanges } from '../../../battle-events/stat-change';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe('OpportunistEffect（びんじょう）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  describe('onOpponentStatChanged', () => {
    it('相手が上げたランクを自分も同じだけ上げる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({ ability: 'びんじょう' });

      // Act
      const message = await new OpportunistEffect().onOpponentStatChanged(
        get(1),
        get(2),
        [
          { statType: 'attack', rankChange: 1 },
          { statType: 'speed', rankChange: 1 },
        ],
        { kind: 'move', name: 'りゅうのまい', pokemon: get(2) },
        context(),
      );

      // Assert
      expect(get(1).attackRank).toBe(1);
      expect(get(1).speedRank).toBe(1);
      expect(message).toBe('Attack rose! Speed rose!');
    });

    it('相手のランクが下がった分は写さない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({ ability: 'びんじょう' });

      // Act
      const message = await new OpportunistEffect().onOpponentStatChanged(
        get(1),
        get(2),
        [
          { statType: 'attack', rankChange: 2 },
          { statType: 'defense', rankChange: -1 },
        ],
        { kind: 'move', name: 'からをやぶる', pokemon: get(2) },
        context(),
      );

      // Assert
      expect(get(1).attackRank).toBe(2);
      expect(get(1).defenseRank).toBe(0);
      expect(message).toBe('Attack rose!');
    });

    it('相手のびんじょうで写した上昇は、写し返さない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({ ability: 'びんじょう' });

      // Act
      const message = await new OpportunistEffect().onOpponentStatChanged(
        get(1),
        get(2),
        [{ statType: 'attack', rankChange: 1 }],
        { kind: 'ability', name: 'びんじょう', pokemon: get(2) },
        context(),
      );

      // Assert
      expect(get(1).attackRank).toBe(0);
      expect(message).toBeNull();
    });
  });

  describe('applyStatChanges との組み合わせ', () => {
    it('相手がつるぎのまいを使うと、自分の攻撃も2段階上がる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({ ability: 'びんじょう' });

      // Act
      const result = await applyStatChanges(
        get(2),
        [{ statType: 'attack', rankChange: 2 }],
        context({ attacker: get(2), defender: get(1) }),
        { source: { kind: 'move', name: 'つるぎのまい', pokemon: get(2) } },
      );

      // Assert
      expect(get(2).attackRank).toBe(2);
      expect(get(1).attackRank).toBe(2);
      expect(result.messages).toEqual(['Attack rose!']);
    });

    it('相手のランクが実際に上がった分だけ写す（+5から2段階上げたら1段階）', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'びんじょう' },
        { status: { attackRank: 5 } },
      );

      // Act
      await applyStatChanges(
        get(2),
        [{ statType: 'attack', rankChange: 2 }],
        context({ attacker: get(2), defender: get(1) }),
        { source: { kind: 'move', name: 'つるぎのまい', pokemon: get(2) } },
      );

      // Assert
      expect(get(1).attackRank).toBe(1);
    });

    it('両方がびんじょうでも、写した上昇は写し返さない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'びんじょう' },
        { ability: 'びんじょう' },
      );

      // Act
      await applyStatChanges(
        get(2),
        [{ statType: 'speed', rankChange: 1 }],
        context({ attacker: get(2), defender: get(1) }),
        { source: { kind: 'move', name: 'ニトロチャージ', pokemon: get(2) } },
      );

      // Assert
      expect(get(2).speedRank).toBe(1);
      expect(get(1).speedRank).toBe(1);
    });

    it('自分のランクが上がっても、相手のランクは変わらない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({ ability: 'びんじょう' });

      // Act
      await applyStatChanges(
        get(1),
        [{ statType: 'attack', rankChange: 2 }],
        context({ attacker: get(1), defender: get(2) }),
        { source: { kind: 'move', name: 'つるぎのまい', pokemon: get(1) } },
      );

      // Assert
      expect(get(1).attackRank).toBe(2);
      expect(get(2).attackRank).toBe(0);
    });
  });
});
