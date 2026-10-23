import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import { ATTACKER_ID, DEFENDER_ID, setupMoveExecutor } from './__tests__/move-executor-test-setup';

describe('MoveExecutorService - 攻撃を受けた回数（timesAttacked。ふんどのこぶし）', () => {
  const twoHits = {
    beforeDamage: async (
      _a: BattlePokemonStatus,
      _d: BattlePokemonStatus,
      _m: unknown,
      ctx: { multiHitCount?: number },
    ) => {
      ctx.multiHitCount = 2;
    },
  };

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('攻撃技が当たると、受けた側の timesAttacked を 1 増やす', async () => {
    // Arrange
    const { execute, statuses } = setupMoveExecutor({ damage: 30 });

    // Act
    await execute();

    // Assert
    expect(statuses.get(DEFENDER_ID)!.volatileState.timesAttacked).toBe(1);
    expect(statuses.get(ATTACKER_ID)!.volatileState.timesAttacked).toBeUndefined();
  });

  it('前の回数に足す', async () => {
    // Arrange
    const { execute, statuses } = setupMoveExecutor({
      damage: 30,
      defender: { volatileState: { timesAttacked: 2 } },
    });

    // Act
    await execute();

    // Assert
    expect(statuses.get(DEFENDER_ID)!.volatileState.timesAttacked).toBe(3);
  });

  it('連続技は、当たったヒットの数だけ増やす（本家の timesAttacked += hit - 1）', async () => {
    // Arrange
    const { execute, statuses } = setupMoveExecutor({ moveEffect: twoHits, damage: 10 });

    // Act
    await execute();

    // Assert
    expect(statuses.get(DEFENDER_ID)!.volatileState.timesAttacked).toBe(2);
  });

  it('ばけのかわなどでダメージが 0 になったヒットも数える', async () => {
    // Arrange
    AbilityRegistry.register('テストばけのかわ', {
      blockDamagingHit: () => Promise.resolve('Disguise blocked the hit!'),
    });
    const { execute, statuses } = setupMoveExecutor({
      damage: 30,
      defenderAbility: 'テストばけのかわ',
    });

    // Act
    await execute();

    // Assert
    expect(statuses.get(DEFENDER_ID)!.volatileState.timesAttacked).toBe(1);
  });

  it('みがわりに当たったヒットは数えない（本家と同じ）', async () => {
    // Arrange
    const { execute, statuses } = setupMoveExecutor({
      damage: 30,
      defender: { volatileState: { substituteHp: 25 } },
    });

    // Act
    await execute();

    // Assert
    expect(statuses.get(DEFENDER_ID)!.volatileState.timesAttacked).toBeUndefined();
  });

  it('ダメージが 0（効果がない）なら数えない', async () => {
    // Arrange
    const { execute, statuses } = setupMoveExecutor({ damage: 0 });

    // Act
    await execute();

    // Assert
    expect(statuses.get(DEFENDER_ID)!.volatileState.timesAttacked).toBeUndefined();
  });
});
