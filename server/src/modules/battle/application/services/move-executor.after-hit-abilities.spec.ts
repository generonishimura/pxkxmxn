import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { StatusCondition } from '../../domain/entities/status-condition.enum';
import { ATTACKER_ID, DEFENDER_ID, setupMoveExecutor } from './__tests__/move-executor-test-setup';

describe('MoveExecutorService - ヒット後に発動する特性', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('じしんかじょう: 技で相手をひんしにすると、攻撃が1段階上がる', async () => {
    // Arrange
    const { execute, statuses } = setupMoveExecutor({
      attackerAbility: 'じしんかじょう',
      defender: { currentHp: 20 },
      damage: 30,
    });

    // Act
    const message = await execute();

    // Assert
    expect(statuses.get(ATTACKER_ID)?.attackRank).toBe(1);
    expect(message).toBe('Used ほのおのパンチ and dealt 20 damage Attack rose!');
  });

  it('じしんかじょう: 相手がひんしにならなければ、攻撃は上がらない', async () => {
    // Arrange
    const { execute, statuses } = setupMoveExecutor({
      attackerAbility: 'じしんかじょう',
      damage: 30,
    });

    // Act
    await execute();

    // Assert
    expect(statuses.get(ATTACKER_ID)?.attackRank).toBe(0);
  });

  it('どくしゅ: 接触技でダメージを与え、30%の判定に当たると相手がどくになる', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const { execute, statuses } = setupMoveExecutor({
      attackerAbility: 'どくしゅ',
      damage: 30,
    });

    // Act
    const message = await execute();

    // Assert
    expect(statuses.get(DEFENDER_ID)?.statusCondition).toBe(StatusCondition.Poison);
    expect(message).toBe('Used ほのおのパンチ and dealt 30 damage どくしゅ activated!');
  });
});
