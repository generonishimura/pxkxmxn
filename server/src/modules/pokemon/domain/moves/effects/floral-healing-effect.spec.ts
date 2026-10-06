import { FloralHealingEffect } from './floral-healing-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { Battle, BattleStatus, Field } from '@/modules/battle/domain/entities/battle.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

describe('FloralHealingEffect', () => {
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

  const createBattleContext = (field: Field | null = null): BattleContext => {
    const battle = new Battle(1, 1, 2, 1, 2, 1, null, field, BattleStatus.Active, null);
    const mockBattleRepository = {
      updateBattlePokemonStatus: jest.fn().mockResolvedValue(undefined),
    };
    return {
      battle,
      battleRepository: mockBattleRepository as unknown as BattleContext['battleRepository'],
      field,
    };
  };

  it('相手の HP を最大 HP の 1/2 回復する', async () => {
    // Arrange
    const effect = new FloralHealingEffect();
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
    const effect = new FloralHealingEffect();
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

  it('相手の HP が満タンなら失敗する', async () => {
    // Arrange
    const effect = new FloralHealingEffect();
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

  it('グラスフィールドでは相手の HP を最大 HP の 2/3 （4096 基準の補正値で 0.667）回復する', async () => {
    // Arrange
    const effect = new FloralHealingEffect();
    const attacker = createBattlePokemonStatus({ currentHp: 10 });
    const defender = createBattlePokemonStatus({ id: 2, currentHp: 10, maxHp: 100 });
    const ctx = createBattleContext(Field.GrassyTerrain);

    // Act
    const result = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(result).toBe("The target's HP was restored!");
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(defender.id, {
      currentHp: 77,
    });
  });

  it('グラスフィールド以外のフィールドでは 1/2 回復のまま', async () => {
    // Arrange
    const effect = new FloralHealingEffect();
    const attacker = createBattlePokemonStatus({ currentHp: 10 });
    const defender = createBattlePokemonStatus({ id: 2, currentHp: 10, maxHp: 100 });
    const ctx = createBattleContext(Field.MistyTerrain);

    // Act
    await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(defender.id, {
      currentHp: 60,
    });
  });
});
