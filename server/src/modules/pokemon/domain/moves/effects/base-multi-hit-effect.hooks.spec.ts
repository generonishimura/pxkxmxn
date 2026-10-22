import { BaseMultiHitEffect } from './base-multi-hit-effect';
import {
  createBattleContext,
  createBattlePokemonStatus,
  createMove,
} from './__tests__/test-helpers';
import { MoveCategory } from '../../entities/move.entity';
import { Type } from '../../entities/type.entity';
import { AbilityRegistry } from '../../abilities/ability-registry';

/**
 * 2-5回攻撃のテスト用連続技
 */
class TestTwoToFiveHitEffect extends BaseMultiHitEffect {
  protected readonly minHits = 2;
  protected readonly maxHits = 5;
}

describe('BaseMultiHitEffect - 攻撃回数の決定', () => {
  const move = createMove(
    'テスト連続技',
    'Test',
    new Type(1, 'ノーマル', 'Normal'),
    MoveCategory.Physical,
  );

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('攻撃側特性の modifyMultiHitCount が返した回数を使う', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0);
    AbilityRegistry.register('テストスキルリンク', {
      modifyMultiHitCount: (_p, _min, max) => max,
    });
    const context = { ...createBattleContext(), attackerAbilityName: 'テストスキルリンク' };

    // Act
    await new TestTwoToFiveHitEffect().beforeDamage(
      createBattlePokemonStatus(),
      createBattlePokemonStatus({ id: 2 }),
      move,
      context,
    );

    // Assert
    expect(context.multiHitCount).toBe(5);
  });

  it('2-5回攻撃は 2回:35% 3回:35% 4回:15% 5回:15% で決まる', async () => {
    // Arrange
    const effect = new TestTwoToFiveHitEffect();
    const rolls = [0, 0.34, 0.35, 0.69, 0.7, 0.84, 0.85, 0.99];
    const counts: Array<number | undefined> = [];

    // Act
    for (const roll of rolls) {
      jest.spyOn(Math, 'random').mockReturnValue(roll);
      const context = createBattleContext();
      await effect.beforeDamage(
        createBattlePokemonStatus(),
        createBattlePokemonStatus(),
        move,
        context,
      );
      counts.push(context.multiHitCount);
    }

    // Assert
    expect(counts).toEqual([2, 2, 3, 3, 4, 4, 5, 5]);
  });
});
