import { InnardsOutEffect } from './innards-out-effect';
import { HitResult } from '../../../battle-events/hit-result';
import { AbilityRegistry } from '../../ability-registry';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe('InnardsOutEffect（とびだすなかみ）', () => {
  const createHit = (damage: number, targetFainted: boolean): HitResult => ({
    damage,
    hpBefore: damage,
    hitIndex: 0,
    hitCount: 1,
    isContact: false,
    moveTypeName: 'ノーマル',
    moveCategory: 'Special',
    targetFainted,
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
    it('ひんしになったとき、受ける前のHPと同じだけ攻撃側にダメージを与える', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'とびだすなかみ', status: { currentHp: 0 } },
        { status: { currentHp: 100, maxHp: 100 } },
      );

      // Act
      const message = await new InnardsOutEffect().onDamagingHit(
        get(1),
        get(2),
        createHit(37, true),
        context(),
      );

      // Assert
      expect(get(2).currentHp).toBe(63);
      expect(message).toBe('とびだすなかみ activated!');
    });

    it('攻撃側の残りHPより大きいダメージでも、HPは0で止まる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'とびだすなかみ', status: { currentHp: 0 } },
        { status: { currentHp: 20, maxHp: 100 } },
      );

      // Act
      await new InnardsOutEffect().onDamagingHit(get(1), get(2), createHit(80, true), context());

      // Assert
      expect(get(2).currentHp).toBe(0);
    });

    it('ひんしにならなかったときは、何もしない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'とびだすなかみ', status: { currentHp: 50 } },
        { status: { currentHp: 100, maxHp: 100 } },
      );

      // Act
      const message = await new InnardsOutEffect().onDamagingHit(
        get(1),
        get(2),
        createHit(50, false),
        context(),
      );

      // Assert
      expect(get(2).currentHp).toBe(100);
      expect(message).toBeNull();
    });

    it('攻撃側がマジックガードなら、ダメージを受けない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'とびだすなかみ', status: { currentHp: 0 } },
        { ability: 'マジックガード', status: { currentHp: 100, maxHp: 100 } },
      );

      // Act
      const message = await new InnardsOutEffect().onDamagingHit(
        get(1),
        get(2),
        createHit(37, true),
        context(),
      );

      // Assert
      expect(get(2).currentHp).toBe(100);
      expect(message).toBeNull();
    });
  });
});
