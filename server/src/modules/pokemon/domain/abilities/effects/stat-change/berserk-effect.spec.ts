import { BerserkEffect } from './berserk-effect';
import { AbilityRegistry } from '../../ability-registry';
import { HitResult } from '../../../battle-events/hit-result';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe('BerserkEffect（ぎゃくじょう）', () => {
  const hit = (damage: number, hpBefore: number): HitResult => ({
    damage,
    hpBefore,
    hitIndex: 0,
    hitCount: 1,
    isContact: true,
    moveTypeName: 'ノーマル',
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

  describe('onAfterMoveHit', () => {
    it('技を受けてHPが半分を上回る状態から半分以下になったら、特攻を1段階上げる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {},
        { ability: 'ぎゃくじょう', status: { currentHp: 50 } },
      );

      // Act
      const message = await new BerserkEffect().onAfterMoveHit(
        get(2),
        get(1),
        hit(30, 80),
        context(),
      );

      // Assert
      expect(get(2).specialAttackRank).toBe(1);
      expect(message).toBe('Special Attack rose!');
    });

    it('技を受ける前からHPが半分以下なら、特攻を上げない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {},
        { ability: 'ぎゃくじょう', status: { currentHp: 30 } },
      );

      // Act
      const message = await new BerserkEffect().onAfterMoveHit(
        get(2),
        get(1),
        hit(20, 50),
        context(),
      );

      // Assert
      expect(get(2).specialAttackRank).toBe(0);
      expect(message).toBeNull();
    });

    it('技を受けてもHPが半分を上回っていれば、特攻を上げない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {},
        { ability: 'ぎゃくじょう', status: { currentHp: 51 } },
      );

      // Act
      const message = await new BerserkEffect().onAfterMoveHit(
        get(2),
        get(1),
        hit(49, 100),
        context(),
      );

      // Assert
      expect(get(2).specialAttackRank).toBe(0);
      expect(message).toBeNull();
    });

    it('ひんしになったら、特攻を上げない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {},
        { ability: 'ぎゃくじょう', status: { currentHp: 0 } },
      );

      // Act
      const message = await new BerserkEffect().onAfterMoveHit(
        get(2),
        get(1),
        hit(100, 100),
        context(),
      );

      // Assert
      expect(get(2).specialAttackRank).toBe(0);
      expect(message).toBeNull();
    });

    it('特攻ランクが+6なら、ランクは変わらない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {},
        { ability: 'ぎゃくじょう', status: { currentHp: 50, specialAttackRank: 6 } },
      );

      // Act
      const message = await new BerserkEffect().onAfterMoveHit(
        get(2),
        get(1),
        hit(50, 100),
        context(),
      );

      // Assert
      expect(get(2).specialAttackRank).toBe(6);
      expect(message).toBeNull();
    });
  });

  it('タイプ相性で技を無効にしたときの onAfterTakingDamage は持たない（HPが半分以下でも上げない）', () => {
    // Arrange
    const effect = new BerserkEffect();

    // Act
    const hasHook = 'onAfterTakingDamage' in effect;

    // Assert
    expect(hasHook).toBe(false);
  });
});
