import { SkillLinkEffect } from './skill-link-effect';
import { AbilityRegistry } from '../../ability-registry';
import { TwoToFiveHitEffect } from '../../../moves/effects/two-to-five-hit-effect';
import {
  createBattleContext,
  createBattlePokemonStatus,
  createMove,
} from '../../../moves/effects/__tests__/test-helpers';
import { MoveCategory } from '../../../entities/move.entity';
import { Type } from '../../../entities/type.entity';

describe('SkillLinkEffect', () => {
  const pokemon = createBattlePokemonStatus();

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('2〜5回攻撃の技は最大の5回になる', () => {
    // Arrange
    const effect = new SkillLinkEffect();

    // Act
    const count = effect.modifyMultiHitCount(pokemon, 2, 5);

    // Assert
    expect(count).toBe(5);
  });

  it('回数が決まっている技はその回数のまま', () => {
    // Arrange
    const effect = new SkillLinkEffect();

    // Act
    const count = effect.modifyMultiHitCount(pokemon, 2, 2);

    // Assert
    expect(count).toBe(2);
  });

  it('スキルリンクのポケモンが使うタネマシンガンは、乱数が最小でも5回当たる', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const move = createMove(
      'タネマシンガン',
      'Bullet Seed',
      new Type(12, 'くさ', 'Grass'),
      MoveCategory.Physical,
    );
    const context = { ...createBattleContext(), attackerAbilityName: 'スキルリンク' };

    // Act
    await new TwoToFiveHitEffect().beforeDamage(
      pokemon,
      createBattlePokemonStatus({ id: 2 }),
      move,
      context,
    );

    // Assert
    expect(context.multiHitCount).toBe(5);
  });
});
