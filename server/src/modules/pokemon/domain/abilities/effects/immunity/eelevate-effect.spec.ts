import { EelevateEffect } from './eelevate-effect';
import { AbilityRegistry } from '../../ability-registry';
import { BattleStatValues } from '../../battle-context.interface';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe('EelevateEffect（Eelevate）', () => {
  const stats = (overrides: Partial<BattleStatValues> = {}): BattleStatValues => ({
    attack: 100,
    defense: 100,
    specialAttack: 100,
    specialDefense: 100,
    speed: 100,
    ...overrides,
  });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  describe('isImmuneToType', () => {
    it('じめんタイプの技を受けない', () => {
      // Arrange
      const { get } = createInMemoryBattle({ ability: 'Eelevate' });

      // Act
      const result = new EelevateEffect().isImmuneToType(get(1), 'じめん');

      // Assert
      expect(result).toBe(true);
    });

    it('じめん以外のタイプの技は受ける', () => {
      // Arrange
      const { get } = createInMemoryBattle({ ability: 'Eelevate' });

      // Act
      const result = new EelevateEffect().isImmuneToType(get(1), 'でんき');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('onKnockOut', () => {
    it('相手をひんしにしたら、実数値が最も高い能力を1段階上げる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'Eelevate' },
        { status: { currentHp: 0 } },
      );

      // Act
      const message = await new EelevateEffect().onKnockOut(
        get(1),
        get(2),
        context({ attackerStats: stats({ specialAttack: 165 }) }),
      );

      // Assert
      expect(get(1).specialAttackRank).toBe(1);
      expect(get(1).attackRank).toBe(0);
      expect(message).toBe('Special Attack rose!');
    });

    it('実数値がわからなければ、何もしない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'Eelevate' },
        { status: { currentHp: 0 } },
      );

      // Act
      const message = await new EelevateEffect().onKnockOut(get(1), get(2), context());

      // Assert
      expect(message).toBeNull();
    });
  });
});
