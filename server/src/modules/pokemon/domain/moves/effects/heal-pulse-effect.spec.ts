import { HealPulseEffect } from './heal-pulse-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

describe('HealPulseEffect', () => {
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

  const createBattleContext = (overrides?: Partial<BattleContext>): BattleContext => {
    const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);
    const mockBattleRepository = {
      updateBattlePokemonStatus: jest.fn().mockResolvedValue(undefined),
    };
    return {
      battle,
      battleRepository: mockBattleRepository as unknown as BattleContext['battleRepository'],
      ...overrides,
    };
  };

  it('相手の HP を最大 HP の 1/2 回復する', async () => {
    // Arrange
    const effect = new HealPulseEffect();
    const attacker = createBattlePokemonStatus({ currentHp: 10 });
    const defender = createBattlePokemonStatus({ id: 2, currentHp: 20, maxHp: 100 });
    const ctx = createBattleContext();

    // Act
    const result = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(result).toBe("The target's HP was restored!");
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledTimes(1);
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(defender.id, {
      currentHp: 70,
    });
  });

  it('回復量は端数を切り上げる（最大 HP 101 なら 51 回復）', async () => {
    // Arrange
    const effect = new HealPulseEffect();
    const attacker = createBattlePokemonStatus({ currentHp: 10 });
    const defender = createBattlePokemonStatus({ id: 2, currentHp: 20, maxHp: 101 });
    const ctx = createBattleContext();

    // Act
    await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(defender.id, {
      currentHp: 71,
    });
  });

  it('使ったポケモンの特性がメガランチャーなら最大 HP の 3/4 を回復する（最大 HP 101 なら 76 回復）', async () => {
    // Arrange
    const effect = new HealPulseEffect();
    const attacker = createBattlePokemonStatus({ currentHp: 10 });
    const defender = createBattlePokemonStatus({ id: 2, currentHp: 20, maxHp: 101 });
    const ctx = createBattleContext({ attackerAbilityName: 'メガランチャー' });

    // Act
    const result = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(result).toBe("The target's HP was restored!");
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(defender.id, {
      currentHp: 96,
    });
  });

  it('メガランチャーでも回復後の HP は最大 HP を超えない', async () => {
    // Arrange
    const effect = new HealPulseEffect();
    const attacker = createBattlePokemonStatus({ currentHp: 10 });
    const defender = createBattlePokemonStatus({ id: 2, currentHp: 50, maxHp: 100 });
    const ctx = createBattleContext({ attackerAbilityName: 'メガランチャー' });

    // Act
    await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(defender.id, {
      currentHp: 100,
    });
  });

  it('メガランチャー以外の特性なら最大 HP の 1/2 回復のまま', async () => {
    // Arrange
    const effect = new HealPulseEffect();
    const attacker = createBattlePokemonStatus({ currentHp: 10 });
    const defender = createBattlePokemonStatus({ id: 2, currentHp: 20, maxHp: 101 });
    const ctx = createBattleContext({ attackerAbilityName: 'てつのこぶし' });

    // Act
    await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(defender.id, {
      currentHp: 71,
    });
  });

  it('相手の HP が満タンなら失敗する', async () => {
    // Arrange
    const effect = new HealPulseEffect();
    const attacker = createBattlePokemonStatus({ currentHp: 10 });
    const defender = createBattlePokemonStatus({
      id: 2,
      currentHp: 100,
      statusCondition: StatusCondition.Burn,
    });
    const ctx = createBattleContext();

    // Act
    const result = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(result).toBeNull();
    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });
});
