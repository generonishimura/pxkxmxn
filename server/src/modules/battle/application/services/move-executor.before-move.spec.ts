import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { ATTACKER_ID, setupMoveExecutor } from './__tests__/move-executor-test-setup';

describe('MoveExecutorService - 技を出そうとしたときの状態の片付け', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('技を出そうとすると、使用者のみちづれとおんねんを消し、ほかのキーは残す', async () => {
    // Arrange
    const { execute, statuses } = setupMoveExecutor({
      attacker: { volatileState: { destinyBond: true, grudge: true, leechSeed: true } },
    });

    // Act
    await execute();

    // Assert
    expect(statuses.get(ATTACKER_ID).volatileState).toEqual({
      leechSeed: true,
      lastMoveId: 1,
      lastMoveTypeName: 'ノーマル',
      consecutiveMoveCount: 1,
    });
  });

  it('みちづれもおんねんもないときは、消す patch を書かない', async () => {
    // Arrange
    const { execute, battleRepository } = setupMoveExecutor({
      attacker: { volatileState: { leechSeed: true, lastMoveId: 1, consecutiveMoveCount: 1 } },
    });

    // Act
    await execute();

    // Assert
    const patches = battleRepository.patchVolatileState.mock.calls.map(([, patch]) => patch);
    expect(patches.some(patch => 'destinyBond' in patch || 'grudge' in patch)).toBe(false);
  });
});
