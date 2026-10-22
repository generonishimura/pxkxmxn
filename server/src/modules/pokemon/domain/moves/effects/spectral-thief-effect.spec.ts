import { SpectralThiefEffect } from './spectral-thief-effect';
import { createMove } from './__tests__/test-helpers';
import { MoveCategory } from '../../entities/move.entity';
import { Type } from '../../entities/type.entity';
import { AbilityRegistry } from '../../abilities/ability-registry';
import { MoveRegistry } from '../move-registry';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';

describe('SpectralThiefEffect（シャドースチール）', () => {
  const move = createMove(
    'シャドースチール',
    'Spectral Thief',
    new Type(8, 'ゴースト', 'Ghost'),
    MoveCategory.Physical,
    { power: 90, accuracy: 100 },
  );

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  describe('beforeDamage', () => {
    it('相手のプラスのランクを0にし、その分だけ自分のランクを上げる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { status: { attackRank: 1, speedRank: -1 } },
        {
          status: {
            attackRank: 2,
            defenseRank: 1,
            specialAttackRank: -2,
            speedRank: 3,
            evasionRank: 1,
          },
        },
      );

      // Act
      await new SpectralThiefEffect().beforeDamage(
        get(1),
        get(2),
        move,
        context({ moveName: 'シャドースチール', moveTypeEffectiveness: 1 }),
      );

      // Assert
      expect(get(2)).toEqual(
        expect.objectContaining({
          attackRank: 0,
          defenseRank: 0,
          specialAttackRank: -2,
          speedRank: 0,
          evasionRank: 0,
        }),
      );
      expect(get(1)).toEqual(
        expect.objectContaining({
          attackRank: 3,
          defenseRank: 1,
          specialAttackRank: 0,
          speedRank: 2,
          evasionRank: 1,
        }),
      );
    });

    it('自分のランクは+6を超えない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { status: { attackRank: 5 } },
        { status: { attackRank: 3 } },
      );

      // Act
      await new SpectralThiefEffect().beforeDamage(
        get(1),
        get(2),
        move,
        context({ moveName: 'シャドースチール', moveTypeEffectiveness: 1 }),
      );

      // Assert
      expect(get(1).attackRank).toBe(6);
      expect(get(2).attackRank).toBe(0);
    });

    it('技が相手に効かない（タイプ相性0）なら、ランクを奪わない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({}, { status: { attackRank: 2 } });

      // Act
      await new SpectralThiefEffect().beforeDamage(
        get(1),
        get(2),
        move,
        context({ moveName: 'シャドースチール', moveTypeEffectiveness: 0 }),
      );

      // Assert
      expect(get(2).attackRank).toBe(2);
      expect(get(1).attackRank).toBe(0);
    });

    it('自分のランクの上昇には自分の特性（たんじゅんなど）が効く', async () => {
      // Arrange
      AbilityRegistry.register('テストたんじゅん', {
        modifyIncomingStatChange: (_h, change) => change.rankChange * 2,
      });
      const { context, get } = createInMemoryBattle(
        { ability: 'テストたんじゅん' },
        { status: { defenseRank: 2 } },
      );

      // Act
      await new SpectralThiefEffect().beforeDamage(
        get(1),
        get(2),
        move,
        context({ moveName: 'シャドースチール', moveTypeEffectiveness: 1 }),
      );

      // Assert
      expect(get(1).defenseRank).toBe(4);
      expect(get(2).defenseRank).toBe(0);
    });
  });

  describe('onHit', () => {
    it('ランクを奪ったら、奪ったことと上がったランクのメッセージを返す', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {},
        { status: { attackRank: 2, speedRank: 1 } },
      );
      const battleContext = context({ moveName: 'シャドースチール', moveTypeEffectiveness: 1 });
      const effect = new SpectralThiefEffect();
      await effect.beforeDamage(get(1), get(2), move, battleContext);

      // Act
      const message = await effect.onHit(get(1), get(2), battleContext);

      // Assert
      expect(message).toBe("Stole the target's stat boosts! Attack rose! Speed rose!");
    });

    it('奪うランクがなければ、メッセージを返さない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({}, { status: { attackRank: -1 } });
      const battleContext = context({ moveName: 'シャドースチール', moveTypeEffectiveness: 1 });
      const effect = new SpectralThiefEffect();
      await effect.beforeDamage(get(1), get(2), move, battleContext);

      // Act
      const message = await effect.onHit(get(1), get(2), battleContext);

      // Assert
      expect(message).toBeNull();
      expect(get(2).attackRank).toBe(-1);
    });

    it('別の技の実行（別のコンテキスト）には、前のメッセージを持ち越さない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({}, { status: { attackRank: 2 } });
      const effect = new SpectralThiefEffect();
      await effect.beforeDamage(
        get(1),
        get(2),
        move,
        context({ moveName: 'シャドースチール', moveTypeEffectiveness: 1 }),
      );

      // Act
      const message = await effect.onHit(get(1), get(2), context({ moveName: 'シャドースチール' }));

      // Assert
      expect(message).toBeNull();
    });
  });

  it('DB の技名で登録されている', () => {
    // Arrange
    MoveRegistry.clear();
    MoveRegistry.initialize();

    // Act
    const effect = MoveRegistry.get('シャドースチール');

    // Assert
    expect(effect).toBeInstanceOf(SpectralThiefEffect);
  });
});
