import { BeastBoostEffect } from './beast-boost-effect';
import { AbilityRegistry } from '../../ability-registry';
import { BattleStatValues } from '../../battle-context.interface';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe('BeastBoostEffect（ビーストブースト）', () => {
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

  describe('onKnockOut', () => {
    it.each([
      ['attack', 'attackRank', 'Attack rose!'],
      ['defense', 'defenseRank', 'Defense rose!'],
      ['specialAttack', 'specialAttackRank', 'Special Attack rose!'],
      ['specialDefense', 'specialDefenseRank', 'Special Defense rose!'],
      ['speed', 'speedRank', 'Speed rose!'],
    ] as const)(
      '相手をひんしにしたら、実数値が最も高い能力（%s）を1段階上げる',
      async (stat, rankProp, expectedMessage) => {
        // Arrange
        const { context, get } = createInMemoryBattle(
          { ability: 'ビーストブースト' },
          { status: { currentHp: 0 } },
        );

        // Act
        const message = await new BeastBoostEffect().onKnockOut(
          get(1),
          get(2),
          context({ attackerStats: stats({ [stat]: 150 }) }),
        );

        // Assert
        expect(get(1)[rankProp]).toBe(1);
        expect(message).toBe(expectedMessage);
      },
    );

    it('最も高い能力はランク補正前の実数値で選ぶ', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'ビーストブースト', status: { speedRank: 6 } },
        { status: { currentHp: 0 } },
      );

      // Act
      await new BeastBoostEffect().onKnockOut(
        get(1),
        get(2),
        context({ attackerStats: stats({ attack: 120, speed: 110 }) }),
      );

      // Assert
      expect(get(1).attackRank).toBe(1);
    });

    it('実数値が同じなら、攻撃・防御・特攻・特防・素早さの順で先の能力を上げる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'ビーストブースト' },
        { status: { currentHp: 0 } },
      );

      // Act
      await new BeastBoostEffect().onKnockOut(
        get(1),
        get(2),
        context({ attackerStats: stats({ defense: 150, specialDefense: 150, speed: 150 }) }),
      );

      // Assert
      expect(get(1).defenseRank).toBe(1);
      expect(get(1).specialDefenseRank).toBe(0);
      expect(get(1).speedRank).toBe(0);
    });

    it('最も高い能力のランクが+6なら、ほかの能力も上げない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'ビーストブースト', status: { attackRank: 6 } },
        { status: { currentHp: 0 } },
      );

      // Act
      const message = await new BeastBoostEffect().onKnockOut(
        get(1),
        get(2),
        context({ attackerStats: stats({ attack: 150 }) }),
      );

      // Assert
      expect(get(1).attackRank).toBe(6);
      expect(get(1).specialAttackRank).toBe(0);
      expect(message).toBeNull();
    });

    it('実数値がわからなければ、何もしない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'ビーストブースト' },
        { status: { currentHp: 0 } },
      );

      // Act
      const message = await new BeastBoostEffect().onKnockOut(get(1), get(2), context());

      // Assert
      expect(get(1).attackRank).toBe(0);
      expect(message).toBeNull();
    });
  });

  it('AbilityRegistryに「ビーストブースト」として登録されている', () => {
    // Arrange
    // （beforeEach でレジストリを初期化済み）

    // Act
    const effect = AbilityRegistry.get('ビーストブースト');

    // Assert
    expect(effect).toBeInstanceOf(BeastBoostEffect);
  });
});
