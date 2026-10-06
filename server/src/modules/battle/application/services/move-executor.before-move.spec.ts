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
    expect(statuses.get(ATTACKER_ID).volatileState).toEqual({ leechSeed: true });
  });

  it('みちづれもおんねんもないときは、使用者の状態を書き込まない', async () => {
    // Arrange
    const { execute, battleRepository } = setupMoveExecutor({
      attacker: { volatileState: { leechSeed: true } },
    });

    // Act
    await execute();

    // Assert
    expect(battleRepository.patchVolatileState).not.toHaveBeenCalled();
  });
});
