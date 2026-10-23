import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { setupMoveExecutor } from './__tests__/move-executor-test-setup';

describe('MoveExecutorService - 技の typeEffectivenessOverrides（フリーズドライ）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('技が持つタイプ相性の上書きを、ダメージ計算に渡す', async () => {
    // Arrange
    const { execute, calculate } = setupMoveExecutor({
      moveEffect: { typeEffectivenessOverrides: { みず: 2 } },
    });

    // Act
    await execute();

    // Assert
    expect(calculate.mock.calls[0][0].typeEffectivenessOverrides).toEqual({ みず: 2 });
  });

  it('上書きを持たない技では渡さない', async () => {
    // Arrange
    const { execute, calculate } = setupMoveExecutor({ moveEffect: {} });

    // Act
    await execute();

    // Assert
    expect(calculate.mock.calls[0][0].typeEffectivenessOverrides).toBeUndefined();
  });
});
