import { BaseSelfMultiStatChangeMoveEffect } from './base-self-multi-stat-change-move-effect';
import { StatType } from './base-stat-change-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

class TestGrowth extends BaseSelfMultiStatChangeMoveEffect {
  protected readonly statChanges: ReadonlyArray<{ statType: StatType; rankChange: number }> = [
    { statType: 'attack', rankChange: 1 },
    { statType: 'specialAttack', rankChange: 1 },
  ];
}

class TestShellSmash extends BaseSelfMultiStatChangeMoveEffect {
  protected readonly statChanges: ReadonlyArray<{ statType: StatType; rankChange: number }> = [
    { statType: 'attack', rankChange: 2 },
    { statType: 'specialAttack', rankChange: 2 },
    { statType: 'speed', rankChange: 2 },
    { statType: 'defense', rankChange: -1 },
    { statType: 'specialDefense', rankChange: -1 },
  ];
}

describe('BaseSelfMultiStatChangeMoveEffect', () => {
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

  it('Growth 相当: 攻撃+1, 特攻+1 を同時適用', async () => {
    const effect = new TestGrowth();
    const attacker = createBattlePokemonStatus();
    const defender = createBattlePokemonStatus({ id: 2 });
    const ctx = createBattleContext();

    const result = await effect.onUse(attacker, defender, ctx);

    expect(result).toBe('Attack rose! Special Attack rose!');
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(attacker.id, {
      attackRank: 1,
      specialAttackRank: 1,
    });
  });

  it('Shell Smash 相当: 3つ上昇 + 2つ下降を一度に適用', async () => {
    const effect = new TestShellSmash();
    const attacker = createBattlePokemonStatus();
    const defender = createBattlePokemonStatus({ id: 2 });
    const ctx = createBattleContext();

    const result = await effect.onUse(attacker, defender, ctx);

    expect(result).toContain('Attack rose!');
    expect(result).toContain('Defense fell!');
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(attacker.id, {
      attackRank: 2,
      specialAttackRank: 2,
      speedRank: 2,
      defenseRank: -1,
      specialDefenseRank: -1,
    });
  });

  it('一部のステが上限に達していてもその他は変化する', async () => {
    const effect = new TestGrowth();
    const attacker = createBattlePokemonStatus({ attackRank: 6 });
    const defender = createBattlePokemonStatus({ id: 2 });
    const ctx = createBattleContext();

    const result = await effect.onUse(attacker, defender, ctx);

    expect(result).toBe('Special Attack rose!');
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(attacker.id, {
      specialAttackRank: 1,
    });
  });

  it('全てのステが上限/下限なら null', async () => {
    const effect = new TestGrowth();
    const attacker = createBattlePokemonStatus({ attackRank: 6, specialAttackRank: 6 });
    const defender = createBattlePokemonStatus({ id: 2 });
    const ctx = createBattleContext();

    const result = await effect.onUse(attacker, defender, ctx);

    expect(result).toBeNull();
    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });

  it('battleRepository が無い場合は null', async () => {
    const effect = new TestGrowth();
    const attacker = createBattlePokemonStatus();
    const defender = createBattlePokemonStatus({ id: 2 });
    const ctx: BattleContext = {
      battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    };

    const result = await effect.onUse(attacker, defender, ctx);

    expect(result).toBeNull();
  });
});
