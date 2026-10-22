import { AngerShellEffect } from './anger-shell-effect';
import { AbilityRegistry } from '../../ability-registry';
import { HitResult } from '../../../battle-events/hit-result';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe('AngerShellEffect（いかりのこうら）', () => {
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

  it('レジストリに いかりのこうら として登録されている', () => {
    // Arrange & Act
    const effect = AbilityRegistry.get('いかりのこうら');

    // Assert
    expect(effect).toBeInstanceOf(AngerShellEffect);
  });

  describe('onAfterMoveHit', () => {
    it('技を受けてHPが半分を上回る状態から半分以下になったら、攻撃・特攻・素早さを上げ、防御・特防を下げる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {},
        { ability: 'いかりのこうら', status: { currentHp: 50 } },
      );

      // Act
      const message = await new AngerShellEffect().onAfterMoveHit(
        get(2),
        get(1),
        hit(30, 80),
        context(),
      );

      // Assert
      expect(get(2)).toMatchObject({
        attackRank: 1,
        specialAttackRank: 1,
        speedRank: 1,
        defenseRank: -1,
        specialDefenseRank: -1,
      });
      expect(message).toBe(
        'Attack rose! Special Attack rose! Speed rose! Defense fell! Special Defense fell!',
      );
    });

    it('技を受ける前からHPが半分以下なら、ランクを変えない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {},
        { ability: 'いかりのこうら', status: { currentHp: 30 } },
      );

      // Act
      const message = await new AngerShellEffect().onAfterMoveHit(
        get(2),
        get(1),
        hit(20, 50),
        context(),
      );

      // Assert
      expect(get(2).attackRank).toBe(0);
      expect(get(2).defenseRank).toBe(0);
      expect(message).toBeNull();
    });

    it('技を受けてもHPが半分を上回っていれば、ランクを変えない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {},
        { ability: 'いかりのこうら', status: { currentHp: 51 } },
      );

      // Act
      const message = await new AngerShellEffect().onAfterMoveHit(
        get(2),
        get(1),
        hit(49, 100),
        context(),
      );

      // Assert
      expect(get(2).attackRank).toBe(0);
      expect(message).toBeNull();
    });

    it('ひんしになったら、ランクを変えない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {},
        { ability: 'いかりのこうら', status: { currentHp: 0 } },
      );

      // Act
      const message = await new AngerShellEffect().onAfterMoveHit(
        get(2),
        get(1),
        hit(100, 100),
        context(),
      );

      // Assert
      expect(get(2).attackRank).toBe(0);
      expect(get(2).defenseRank).toBe(0);
      expect(message).toBeNull();
    });

    it('攻撃ランクが+6なら、攻撃以外のランクだけ変わる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {},
        { ability: 'いかりのこうら', status: { currentHp: 50, attackRank: 6 } },
      );

      // Act
      const message = await new AngerShellEffect().onAfterMoveHit(
        get(2),
        get(1),
        hit(50, 100),
        context(),
      );

      // Assert
      expect(get(2).attackRank).toBe(6);
      expect(get(2).specialAttackRank).toBe(1);
      expect(get(2).defenseRank).toBe(-1);
      expect(message).toBe('Special Attack rose! Speed rose! Defense fell! Special Defense fell!');
    });
  });
});
