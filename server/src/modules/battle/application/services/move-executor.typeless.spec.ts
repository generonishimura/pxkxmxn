import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { StruggleEffect } from '@/modules/pokemon/domain/moves/effects/struggle-effect';
import { DamageCalculationParams } from '../../domain/logic/damage-calculator';
import { createMove, setupMoveExecutor } from './__tests__/move-executor-test-setup';

describe('MoveExecutorService - タイプなしの技（わるあがき）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('タイプなしの技は、タイプ相性表にもポケモンのタイプにもないタイプで計算する（相性1倍・タイプ一致なし）', async () => {
    // Arrange
    const { execute, calculate } = setupMoveExecutor({
      move: createMove('わるあがき'),
      moveEffect: new StruggleEffect(),
    });

    // Act
    await execute();

    // Assert
    const params: DamageCalculationParams = calculate.mock.calls[0][0];
    expect(params.moveType.id).toBeLessThan(1);
    expect(params.move.typeId).toBe(params.moveType.id);
    expect(params.battleContext?.moveTypeName).toBe(params.moveType.name);
  });

  it('タイプなしの技のタイプは、攻撃側の特性（スキン系など）でも変わらない', async () => {
    // Arrange
    const modifyMoveType = jest.fn().mockReturnValue('ひこう');
    AbilityRegistry.register('テストスカイスキン', { modifyMoveType });
    const { execute, calculate } = setupMoveExecutor({
      move: createMove('わるあがき'),
      moveEffect: new StruggleEffect(),
      attackerAbility: 'テストスカイスキン',
    });

    // Act
    await execute();

    // Assert
    expect(modifyMoveType).not.toHaveBeenCalled();
    const params: DamageCalculationParams = calculate.mock.calls[0][0];
    expect(params.moveType.id).toBeLessThan(1);
  });
});
