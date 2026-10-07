import { TraceEffect } from './trace-effect';
import { AbilityRegistry } from '../../ability-registry';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe('TraceEffect（トレース）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('トレース として登録されている', () => {
    // Arrange & Act
    const effect = AbilityRegistry.get('トレース');

    // Assert
    expect(effect).toBeInstanceOf(TraceEffect);
  });

  describe('onEntry', () => {
    it('場に出たとき、相手の特性を写す', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({ ability: 'トレース' }, { ability: 'ふみん' });

      // Act
      await new TraceEffect().onEntry(get(1), context());

      // Assert
      expect(get(1).volatileState.abilityOverride).toBe('ふみん');
    });

    it('写した特性が場に出たときの特性なら発動する（いかく）', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({ ability: 'トレース' }, { ability: 'いかく' });

      // Act
      await new TraceEffect().onEntry(get(1), context());

      // Assert
      expect(get(1).volatileState.abilityOverride).toBe('いかく');
      expect(get(2).attackRank).toBe(-1);
    });

    it('相手の今の特性（上書きされた特性）を写す', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'トレース' },
        { ability: 'ふみん', status: { volatileState: { abilityOverride: 'たんじゅん' } } },
      );

      // Act
      await new TraceEffect().onEntry(get(1), context());

      // Assert
      expect(get(1).volatileState.abilityOverride).toBe('たんじゅん');
    });

    it('トレースで写せない特性（イリュージョン）は写さない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'トレース' },
        { ability: 'イリュージョン' },
      );

      // Act
      await new TraceEffect().onEntry(get(1), context());

      // Assert
      expect(get(1).volatileState.abilityOverride).toBeUndefined();
    });

    it('相手がひんしなら写さない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'トレース' },
        { ability: 'ふみん', status: { currentHp: 0 } },
      );

      // Act
      await new TraceEffect().onEntry(get(1), context());

      // Assert
      expect(get(1).volatileState.abilityOverride).toBeUndefined();
    });
  });

  describe('onFoeEntry', () => {
    it('場に出たときに写せなかったら、あとから出てきた相手の特性を写す', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({ ability: 'トレース' }, { ability: 'ふみん' });

      // Act
      await new TraceEffect().onFoeEntry(get(1), get(2), context());

      // Assert
      expect(get(1).volatileState.abilityOverride).toBe('ふみん');
    });

    it('もう写したあとなら、出てきた相手の特性は写さない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'トレース', status: { volatileState: { abilityOverride: 'いかく' } } },
        { ability: 'ふみん' },
      );

      // Act
      await new TraceEffect().onFoeEntry(get(1), get(2), context());

      // Assert
      expect(get(1).volatileState.abilityOverride).toBe('いかく');
    });

    it('出てきた相手の特性がトレースで写せない特性なら写さない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'トレース' },
        { ability: 'トレース' },
      );

      // Act
      await new TraceEffect().onFoeEntry(get(1), get(2), context());

      // Assert
      expect(get(1).volatileState.abilityOverride).toBeUndefined();
    });
  });
});
