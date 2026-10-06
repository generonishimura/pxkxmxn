import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { ATTACKER_ID, DEFENDER_ID, setupMoveExecutor } from './__tests__/move-executor-test-setup';

describe('MoveExecutorService - なまけ', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('技を出したら次のターンは休み、その次のターンはまた技を出す', async () => {
    // Arrange
    const { execute, statuses } = setupMoveExecutor({ attackerAbility: 'なまけ', damage: 10 });

    // Act
    await execute();
    const loafingMessage = await execute();
    await execute();

    // Assert
    expect(loafingMessage).toContain('is loafing around!');
    expect(statuses.get(DEFENDER_ID).currentHp).toBe(80);
    expect(statuses.get(ATTACKER_ID).volatileState.loafing).toBe(true);
  });

  it('反動で動けないターンが休みの代わりになり、次のターンは技を出して、その次は休む', async () => {
    // Arrange
    const { execute, statuses } = setupMoveExecutor({
      attackerAbility: 'なまけ',
      attacker: { volatileState: { loafing: true, mustRecharge: true } },
      damage: 10,
    });

    // Act
    await execute();
    await execute();
    const loafingMessage = await execute();

    // Assert
    expect(statuses.get(DEFENDER_ID).currentHp).toBe(90);
    expect(loafingMessage).toContain('is loafing around!');
  });
});
