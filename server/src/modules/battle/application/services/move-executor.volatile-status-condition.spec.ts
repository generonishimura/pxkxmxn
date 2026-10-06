import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { StatusCondition } from '../../domain/entities/status-condition.enum';
import { StatusConditionHandler } from '../../domain/logic/status-condition-handler';
import { ATTACKER_ID, DEFENDER_ID, setupMoveExecutor } from './__tests__/move-executor-test-setup';

describe('MoveExecutorService - こんらん・ひるみ（volatileState）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('技を出そうとするたびに、こんらんの残り回数を 1 減らす', async () => {
    // Arrange
    jest.spyOn(StatusConditionHandler, 'shouldSelfAttackFromConfusion').mockReturnValue(false);
    const { execute, statuses } = setupMoveExecutor({
      attacker: { volatileState: { confusionTurns: 3 } },
    });

    // Act
    await execute();

    // Assert
    expect(statuses.get(ATTACKER_ID).volatileState.confusionTurns).toBe(2);
  });

  it('残り回数が 0 になると、こんらんが解けてそのまま技を出す', async () => {
    // Arrange
    const selfAttack = jest
      .spyOn(StatusConditionHandler, 'shouldSelfAttackFromConfusion')
      .mockReturnValue(true);
    const { execute, statuses } = setupMoveExecutor({
      attacker: { volatileState: { confusionTurns: 1 } },
    });

    // Act
    const message = await execute();

    // Assert
    expect(statuses.get(ATTACKER_ID).volatileState.confusionTurns).toBeUndefined();
    expect(selfAttack).not.toHaveBeenCalled();
    expect(statuses.get(DEFENDER_ID).currentHp).toBe(90);
    expect(message).toContain('snapped out of confusion');
  });

  it('状態異常があっても、こんらんの自傷を判定する', async () => {
    // Arrange
    jest.spyOn(StatusConditionHandler, 'shouldSelfAttackFromConfusion').mockReturnValue(true);
    const { execute, statuses } = setupMoveExecutor({
      attacker: { statusCondition: StatusCondition.Burn, volatileState: { confusionTurns: 3 } },
    });

    // Act
    const message = await execute();

    // Assert
    expect(message).toContain('hurt itself in confusion');
    expect(statuses.get(DEFENDER_ID).currentHp).toBe(100);
    expect(statuses.get(ATTACKER_ID).statusCondition).toBe(StatusCondition.Burn);
  });

  it('こんらんしていなければ、自傷を判定しない', async () => {
    // Arrange
    const selfAttack = jest.spyOn(StatusConditionHandler, 'shouldSelfAttackFromConfusion');
    const { execute } = setupMoveExecutor();

    // Act
    await execute();

    // Assert
    expect(selfAttack).not.toHaveBeenCalled();
  });

  it('ひるんでいると技を出せず、相手にダメージを与えない', async () => {
    // Arrange
    const { execute, statuses } = setupMoveExecutor({
      attacker: { volatileState: { flinched: true } },
    });

    // Act
    const message = await execute();

    // Assert
    expect(message).toBe("Pokemon flinched and couldn't move");
    expect(statuses.get(DEFENDER_ID).currentHp).toBe(100);
  });

  it('ひるんだときは、こんらんの残り回数を減らさない', async () => {
    // Arrange
    const { execute, statuses } = setupMoveExecutor({
      attacker: { volatileState: { flinched: true, confusionTurns: 3 } },
    });

    // Act
    await execute();

    // Assert
    expect(statuses.get(ATTACKER_ID).volatileState.confusionTurns).toBe(3);
  });
});
