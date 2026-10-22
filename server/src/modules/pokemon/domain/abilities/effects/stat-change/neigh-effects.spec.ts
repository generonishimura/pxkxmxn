import { ChillingNeighEffect } from './chilling-neigh-effect';
import { GrimNeighEffect } from './grim-neigh-effect';
import { AsOneGlastrierEffect } from './as-one-glastrier-effect';
import { AbilityRegistry } from '../../ability-registry';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe('相手を倒すと能力が上がる特性（しろのいななき・くろのいななき・じんばいったい）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it.each([
    ['しろのいななき', ChillingNeighEffect],
    ['くろのいななき', GrimNeighEffect],
    ['じんばいったい', AsOneGlastrierEffect],
  ])('%s として登録されている', (name, effectClass) => {
    // Arrange & Act
    const effect = AbilityRegistry.get(name);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
  });

  describe('ChillingNeighEffect（しろのいななき）', () => {
    it('技で相手を倒したら、攻撃を1段階上げる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'しろのいななき' },
        { status: { currentHp: 0 } },
      );

      // Act
      const message = await new ChillingNeighEffect().onKnockOut(get(1), get(2), context());

      // Assert
      expect(get(1).attackRank).toBe(1);
      expect(get(1).specialAttackRank).toBe(0);
      expect(message).toBe('Attack rose!');
    });

    it('攻撃ランクが+6なら、ランクは変わらない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'しろのいななき', status: { attackRank: 6 } },
        { status: { currentHp: 0 } },
      );

      // Act
      const message = await new ChillingNeighEffect().onKnockOut(get(1), get(2), context());

      // Assert
      expect(get(1).attackRank).toBe(6);
      expect(message).toBeNull();
    });

    it('コンテキストがなければ何もしない', async () => {
      // Arrange
      const { get } = createInMemoryBattle(
        { ability: 'しろのいななき' },
        { status: { currentHp: 0 } },
      );

      // Act
      const message = await new ChillingNeighEffect().onKnockOut(get(1), get(2));

      // Assert
      expect(get(1).attackRank).toBe(0);
      expect(message).toBeNull();
    });
  });

  describe('GrimNeighEffect（くろのいななき）', () => {
    it('技で相手を倒したら、特攻を1段階上げる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'くろのいななき' },
        { status: { currentHp: 0 } },
      );

      // Act
      const message = await new GrimNeighEffect().onKnockOut(get(1), get(2), context());

      // Assert
      expect(get(1).specialAttackRank).toBe(1);
      expect(get(1).attackRank).toBe(0);
      expect(message).toBe('Special Attack rose!');
    });
  });

  describe('AsOneGlastrierEffect（じんばいったい）', () => {
    it('技で相手を倒したら、しろのいななきと同じく攻撃を1段階上げる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'じんばいったい' },
        { status: { currentHp: 0 } },
      );

      // Act
      const message = await new AsOneGlastrierEffect().onKnockOut(get(1), get(2), context());

      // Assert
      expect(get(1).attackRank).toBe(1);
      expect(message).toBe('Attack rose!');
    });
  });
});
