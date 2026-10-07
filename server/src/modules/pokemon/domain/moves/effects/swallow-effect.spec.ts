import { SwallowEffect } from './swallow-effect';
import { AbilityRegistry } from '../../abilities/ability-registry';
import { MoveRegistry } from '../move-registry';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';

describe('SwallowEffect（のみこむ）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  describe('shouldFail', () => {
    it('たくわえていなければ失敗する', () => {
      // Arrange
      const { get } = createInMemoryBattle();

      // Act
      const failed = new SwallowEffect().shouldFail(get(1));

      // Assert
      expect(failed).toBe(true);
    });

    it('たくわえていれば失敗しない', () => {
      // Arrange
      const { get } = createInMemoryBattle({
        status: { volatileState: { stockpileCount: 1 } },
      });

      // Act
      const failed = new SwallowEffect().shouldFail(get(1));

      // Assert
      expect(failed).toBe(false);
    });
  });

  describe('onUse', () => {
    it.each([
      [1, 26],
      [2, 51],
      [3, 102],
    ])(
      'たくわえた回数が %i 回なら、最大 HP 103 の割合（本家の modify と同じ丸め）で %i 回復する',
      async (stockpileCount, expectedHeal) => {
        // Arrange
        const { context, get } = createInMemoryBattle({
          status: { maxHp: 103, currentHp: 1, volatileState: { stockpileCount } },
        });

        // Act
        const message = await new SwallowEffect().onUse(get(1), get(2), context());

        // Assert
        expect(get(1).currentHp).toBe(1 + expectedHeal);
        expect(message).toBe(`restored ${expectedHeal} HP!`);
      },
    );

    it('かいふくふうじ中なら回復しないが、たくわえるは消える', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({
        status: { currentHp: 50, volatileState: { stockpileCount: 3, healBlockTurns: 2 } },
      });

      // Act
      const message = await new SwallowEffect().onUse(get(1), get(2), context());

      // Assert
      expect(get(1).currentHp).toBe(50);
      expect(get(1).volatileState.stockpileCount).toBeUndefined();
      expect(message).toBe('But it failed');
    });

    it('たくわえるを消し、たくわえるで上がった分だけ防御と特防を下げる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({
        status: {
          currentHp: 50,
          defenseRank: 3,
          specialDefenseRank: 2,
          volatileState: { stockpileCount: 2, stockpileBoosts: { defense: 2, specialDefense: 2 } },
        },
      });

      // Act
      const message = await new SwallowEffect().onUse(get(1), get(2), context());

      // Assert
      expect(get(1).volatileState.stockpileCount).toBeUndefined();
      expect(get(1).volatileState.stockpileBoosts).toBeUndefined();
      expect(get(1).defenseRank).toBe(1);
      expect(get(1).specialDefenseRank).toBe(0);
      expect(message).toBe('restored 50 HP! Defense fell! Special Defense fell!');
    });

    it('上がらなかった能力（0）は下げない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({
        status: {
          currentHp: 50,
          defenseRank: 6,
          specialDefenseRank: 1,
          volatileState: { stockpileCount: 1, stockpileBoosts: { defense: 0, specialDefense: 1 } },
        },
      });

      // Act
      await new SwallowEffect().onUse(get(1), get(2), context());

      // Assert
      expect(get(1).defenseRank).toBe(6);
      expect(get(1).specialDefenseRank).toBe(0);
    });

    it('HP が満タンなら回復に失敗するが、たくわえるは消えて能力も下がる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({
        status: {
          defenseRank: 1,
          specialDefenseRank: 1,
          volatileState: { stockpileCount: 1, stockpileBoosts: { defense: 1, specialDefense: 1 } },
        },
      });

      // Act
      const message = await new SwallowEffect().onUse(get(1), get(2), context());

      // Assert
      expect(get(1).volatileState.stockpileCount).toBeUndefined();
      expect(get(1).defenseRank).toBe(0);
      expect(message).toBe('But it failed Defense fell! Special Defense fell!');
    });
  });

  it('MoveRegistry に のみこむ として登録されている', () => {
    // Arrange
    MoveRegistry.initialize();

    // Act
    const effect = MoveRegistry.get('のみこむ');

    // Assert
    expect(effect).toBeInstanceOf(SwallowEffect);
  });
});
