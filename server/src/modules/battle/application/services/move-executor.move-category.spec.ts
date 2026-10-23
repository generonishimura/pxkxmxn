import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { HitResult } from '@/modules/pokemon/domain/battle-events/hit-result';
import { IMoveEffect } from '@/modules/pokemon/domain/moves/move-effect.interface';
import { MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { createMove, setupMoveExecutor } from './__tests__/move-executor-test-setup';

describe('MoveExecutorService - 技の modifyMoveCategory（シェルアームズ・てんこがすめつぼうのひかり）', () => {
  // 特殊技で、接触しない技（move-flag-table に contact がない）
  const specialMove = createMove('シェルアームズ', MoveCategory.Special, 90);

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('返した分類でダメージを計算し、ヒットの情報にも入れる', async () => {
    // Arrange
    const onDamagingHit = jest.fn().mockResolvedValue(null);
    AbilityRegistry.register('テストじきゅうりょく', { onDamagingHit });
    const moveEffect: IMoveEffect = { modifyMoveCategory: () => 'Physical' };
    const { execute, calculate } = setupMoveExecutor({
      move: specialMove,
      moveEffect,
      defenderAbility: 'テストじきゅうりょく',
    });

    // Act
    await execute();

    // Assert
    const params = calculate.mock.calls[0][0];
    expect(params.move.category).toBe('Physical');
    expect(params.battleContext?.moveCategory).toBe('Physical');
    const hit: HitResult = onDamagingHit.mock.calls[0][2];
    expect(hit.moveCategory).toBe('Physical');
  });

  it('物理技になり contactWhenPhysical なら、接触技として扱う', async () => {
    // Arrange
    const onDamagingHit = jest.fn().mockResolvedValue(null);
    AbilityRegistry.register('テストさめはだ', { onDamagingHit });
    const moveEffect: IMoveEffect = {
      modifyMoveCategory: () => 'Physical',
      contactWhenPhysical: true,
    };
    const { execute } = setupMoveExecutor({
      move: specialMove,
      moveEffect,
      defenderAbility: 'テストさめはだ',
    });

    // Act
    await execute();

    // Assert
    const hit: HitResult = onDamagingHit.mock.calls[0][2];
    expect(hit.isContact).toBe(true);
  });

  it('特殊技のままなら、contactWhenPhysical でも接触しない', async () => {
    // Arrange
    const onDamagingHit = jest.fn().mockResolvedValue(null);
    AbilityRegistry.register('テストさめはだ', { onDamagingHit });
    const moveEffect: IMoveEffect = {
      modifyMoveCategory: () => 'Special',
      contactWhenPhysical: true,
    };
    const { execute, calculate } = setupMoveExecutor({
      move: specialMove,
      moveEffect,
      defenderAbility: 'テストさめはだ',
    });

    // Act
    await execute();

    // Assert
    expect(calculate.mock.calls[0][0].move.category).toBe('Special');
    const hit: HitResult = onDamagingHit.mock.calls[0][2];
    expect(hit.isContact).toBe(false);
  });

  it('使用者と相手の状態と実数値を渡す', async () => {
    // Arrange
    const modifyMoveCategory = jest.fn().mockReturnValue(undefined);
    const { execute } = setupMoveExecutor({
      move: specialMove,
      moveEffect: { modifyMoveCategory },
    });

    // Act
    await execute();

    // Assert
    const [attacker, defender, ctx] = modifyMoveCategory.mock.calls[0];
    expect(attacker.id).toBe(1);
    expect(defender.id).toBe(2);
    expect(ctx.attackerStats).toBeDefined();
    expect(ctx.defenderStats).toBeDefined();
  });
});
