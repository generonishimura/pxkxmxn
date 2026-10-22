import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { Move, MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { Type } from '@/modules/pokemon/domain/entities/type.entity';
import { IMoveEffect } from '@/modules/pokemon/domain/moves/move-effect.interface';
import { applyStatChanges } from '@/modules/pokemon/domain/battle-events/stat-change';
import { moveEffectSource } from '@/modules/pokemon/domain/moves/effects/base/base-stat-change-effect';
import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import {
  ATTACKER_ID,
  DEFENDER_ID,
  NORMAL,
  setupMoveExecutor,
} from './__tests__/move-executor-test-setup';

/**
 * 技の beforeDamage に、決まった技のタイプと、技が相手に効くかが渡るかを確かめる（シャドースチール用）
 */
describe('MoveExecutorService - beforeDamage に渡す技のタイプと相性', () => {
  const GHOST = new Type(8, 'ゴースト', 'Ghost');
  const spectralThief = new Move(
    1,
    'シャドースチール',
    'Spectral Thief',
    GHOST,
    MoveCategory.Physical,
    90,
    100,
    10,
    0,
    null,
  );
  const ghostVsNormalImmune = () => new Map([[`${GHOST.id}-${NORMAL.id}`, 0]]);

  /**
   * 文書どおりのシャドースチール: 技が相手に効くときだけ、相手のプラスのランクを奪う
   */
  const stealBoosts: IMoveEffect = {
    beforeDamage: async (
      attacker: BattlePokemonStatus,
      defender: BattlePokemonStatus,
      _move: Move,
      ctx: BattleContext,
    ) => {
      if (ctx.moveTypeEffectiveness === 0 || defender.attackRank <= 0) return;
      await ctx.battleRepository?.updateBattlePokemonStatus(defender.id, { attackRank: 0 });
      await applyStatChanges(
        attacker,
        [{ statType: 'attack', rankChange: defender.attackRank }],
        ctx,
        { source: moveEffectSource(attacker, ctx) },
      );
    },
  };

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('beforeDamage には、技と特性で変えたあとの技のタイプが入る', async () => {
    // Arrange
    const seen: Array<string | undefined> = [];
    const { execute, typeEffectivenessRepository } = setupMoveExecutor({
      moveEffect: {
        modifyMoveType: () => 'ゴースト',
        beforeDamage: async (_a, _d, _m, ctx) => {
          seen.push(ctx.moveTypeName);
        },
      },
    });
    typeEffectivenessRepository.findTypeByName.mockResolvedValue(GHOST);

    // Act
    await execute();

    // Assert
    expect(seen).toEqual(['ゴースト']);
  });

  it('タイプ相性で技が効かない相手なら、beforeDamage の moveTypeEffectiveness は 0', async () => {
    // Arrange
    const seen: Array<number | undefined> = [];
    const { execute, typeEffectivenessRepository } = setupMoveExecutor({
      move: spectralThief,
      moveEffect: {
        beforeDamage: async (_a, _d, _m, ctx) => {
          seen.push(ctx.moveTypeEffectiveness);
        },
      },
    });
    typeEffectivenessRepository.getTypeEffectivenessMap.mockResolvedValue(ghostVsNormalImmune());

    // Act
    await execute();

    // Assert
    expect(seen).toEqual([0]);
  });

  it('防御側の特性でタイプごと無効になる相手なら、beforeDamage の moveTypeEffectiveness は 0', async () => {
    // Arrange
    AbilityRegistry.register('テストゴーストむこう', {
      isImmuneToType: (_p, typeName) => typeName === 'ゴースト',
    });
    const seen: Array<number | undefined> = [];
    const { execute } = setupMoveExecutor({
      move: spectralThief,
      defenderAbility: 'テストゴーストむこう',
      moveEffect: {
        beforeDamage: async (_a, _d, _m, ctx) => {
          seen.push(ctx.moveTypeEffectiveness);
        },
      },
    });

    // Act
    await execute();

    // Assert
    expect(seen).toEqual([0]);
  });

  it('技が効く相手なら、beforeDamage の moveTypeEffectiveness は相性の倍率', async () => {
    // Arrange
    const seen: Array<number | undefined> = [];
    const { execute, typeEffectivenessRepository } = setupMoveExecutor({
      move: spectralThief,
      moveEffect: {
        beforeDamage: async (_a, _d, _m, ctx) => {
          seen.push(ctx.moveTypeEffectiveness);
        },
      },
    });
    typeEffectivenessRepository.getTypeEffectivenessMap.mockResolvedValue(
      new Map([[`${GHOST.id}-${NORMAL.id}`, 2]]),
    );

    // Act
    await execute();

    // Assert
    expect(seen).toEqual([2]);
  });

  it('シャドースチールはノーマルタイプの相手からランクを奪わない', async () => {
    // Arrange
    const { execute, statuses, typeEffectivenessRepository } = setupMoveExecutor({
      move: spectralThief,
      moveEffect: stealBoosts,
      defender: { attackRank: 2 },
    });
    typeEffectivenessRepository.getTypeEffectivenessMap.mockResolvedValue(ghostVsNormalImmune());

    // Act
    await execute();

    // Assert
    expect(statuses.get(DEFENDER_ID)?.attackRank).toBe(2);
    expect(statuses.get(ATTACKER_ID)?.attackRank).toBe(0);
  });

  it('シャドースチールは技が効く相手からはランクを奪う', async () => {
    // Arrange
    const { execute, statuses } = setupMoveExecutor({
      move: spectralThief,
      moveEffect: stealBoosts,
      defender: { attackRank: 2 },
    });

    // Act
    await execute();

    // Assert
    expect(statuses.get(DEFENDER_ID)?.attackRank).toBe(0);
    expect(statuses.get(ATTACKER_ID)?.attackRank).toBe(2);
  });
});
