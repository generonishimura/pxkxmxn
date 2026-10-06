import { PurifyEffect } from './purify-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

describe('PurifyEffect', () => {
  const createBattlePokemonStatus = (
    overrides?: Partial<BattlePokemonStatus>,
  ): BattlePokemonStatus =>
    new BattlePokemonStatus(
      overrides?.id ?? 1,
      overrides?.battleId ?? 1,
      overrides?.trainedPokemonId ?? 1,
      overrides?.trainerId ?? 1,
      overrides?.isActive ?? true,
      overrides?.currentHp ?? 100,
      overrides?.maxHp ?? 100,
      overrides?.attackRank ?? 0,
      overrides?.defenseRank ?? 0,
      overrides?.specialAttackRank ?? 0,
      overrides?.specialDefenseRank ?? 0,
      overrides?.speedRank ?? 0,
      overrides?.accuracyRank ?? 0,
      overrides?.evasionRank ?? 0,
      overrides?.statusCondition ?? null,
    );

  const createBattleContext = (): BattleContext => {
    const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);
    const mockBattleRepository = {
      updateBattlePokemonStatus: jest.fn().mockResolvedValue(undefined),
    };
    return {
      battle,
      battleRepository: mockBattleRepository as unknown as BattleContext['battleRepository'],
    };
  };

  it('相手の状態異常を治し、自分の HP を最大 HP の 1/2 回復する', async () => {
    // Arrange
    const effect = new PurifyEffect();
    const attacker = createBattlePokemonStatus({ currentHp: 30, maxHp: 101 });
    const defender = createBattlePokemonStatus({ id: 2, statusCondition: StatusCondition.Burn });
    const ctx = createBattleContext();

    // Act
    const result = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(result).toBe("The target's status condition was cured! HP was restored!");
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(defender.id, {
      statusCondition: StatusCondition.None,
    });
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(attacker.id, {
      currentHp: 80,
    });
  });

  it('自分の HP が満タンでも、相手の状態異常は治す', async () => {
    // Arrange
    const effect = new PurifyEffect();
    const attacker = createBattlePokemonStatus({ currentHp: 100, maxHp: 100 });
    const defender = createBattlePokemonStatus({ id: 2, statusCondition: StatusCondition.Sleep });
    const ctx = createBattleContext();

    // Act
    const result = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(result).toBe("The target's status condition was cured!");
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledTimes(1);
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(defender.id, {
      statusCondition: StatusCondition.None,
    });
  });

  it('回復量は最大 HP を超えない', async () => {
    // Arrange
    const effect = new PurifyEffect();
    const attacker = createBattlePokemonStatus({ currentHp: 80, maxHp: 100 });
    const defender = createBattlePokemonStatus({ id: 2, statusCondition: StatusCondition.Poison });
    const ctx = createBattleContext();

    // Act
    await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(attacker.id, {
      currentHp: 100,
    });
  });

  it('相手が状態異常でなければ失敗する', async () => {
    // Arrange
    const effect = new PurifyEffect();
    const attacker = createBattlePokemonStatus({ currentHp: 30 });
    const defender = createBattlePokemonStatus({ id: 2, statusCondition: null });
    const ctx = createBattleContext();

    // Act
    const result = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(result).toBeNull();
    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });

  it('相手がこんらんしているだけなら失敗する', async () => {
    // Arrange
    const effect = new PurifyEffect();
    const attacker = createBattlePokemonStatus({ currentHp: 30 });
    const defender = createBattlePokemonStatus({
      id: 2,
      statusCondition: StatusCondition.Confusion,
    });
    const ctx = createBattleContext();

    // Act
    const result = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(result).toBeNull();
    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });
});
