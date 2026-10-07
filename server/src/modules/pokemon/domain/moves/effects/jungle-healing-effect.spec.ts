import { JungleHealingEffect } from './jungle-healing-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

describe('JungleHealingEffect', () => {
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

  it('自分の HP を最大 HP の 1/4 回復し、状態異常を治す', async () => {
    // Arrange
    const effect = new JungleHealingEffect();
    const attacker = createBattlePokemonStatus({
      currentHp: 40,
      maxHp: 100,
      statusCondition: StatusCondition.Poison,
    });
    const defender = createBattlePokemonStatus({ id: 2, currentHp: 10 });
    const ctx = createBattleContext();

    // Act
    const result = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(result).toBe('HP was restored! Status condition was cured!');
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledTimes(1);
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(attacker.id, {
      currentHp: 65,
      statusCondition: StatusCondition.None,
    });
  });

  it.each([
    [103, 36],
    [102, 35],
  ])(
    '回復量は 4096 基準の補正値で計算する（最大 HP %i のとき HP 10 から %i になる）',
    async (maxHp, expectedHp) => {
      // Arrange
      const effect = new JungleHealingEffect();
      const attacker = createBattlePokemonStatus({ currentHp: 10, maxHp });
      const defender = createBattlePokemonStatus({ id: 2, currentHp: 10 });
      const ctx = createBattleContext();

      // Act
      await effect.onUse(attacker, defender, ctx);

      // Assert
      expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(attacker.id, {
        currentHp: expectedHp,
      });
    },
  );

  it('HP が満タンで状態異常もなければ失敗する', async () => {
    // Arrange
    const effect = new JungleHealingEffect();
    const attacker = createBattlePokemonStatus({ currentHp: 100, maxHp: 100 });
    const defender = createBattlePokemonStatus({ id: 2 });
    const ctx = createBattleContext();

    // Act
    const result = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(result).toBe('But it failed');
    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });
});
