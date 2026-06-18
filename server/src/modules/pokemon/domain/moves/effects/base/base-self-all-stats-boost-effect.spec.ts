import { BaseSelfAllStatsBoostEffect } from './base-self-all-stats-boost-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

class TestAllStatsBoost10 extends BaseSelfAllStatsBoostEffect {
  protected readonly chance = 0.1;
}

class TestAllStatsBoost100 extends BaseSelfAllStatsBoostEffect {
  protected readonly chance = 1.0;
}

describe('BaseSelfAllStatsBoostEffect', () => {
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

  it('確率が当たれば主要5能力 +1', async () => {
    const effect = new TestAllStatsBoost100();
    const attacker = createBattlePokemonStatus();
    const defender = createBattlePokemonStatus({ id: 2 });
    const ctx = createBattleContext();

    const result = await effect.onHit(attacker, defender, ctx);

    expect(result).toBe("user's stats rose!");
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(attacker.id, {
      attackRank: 1,
      defenseRank: 1,
      specialAttackRank: 1,
      specialDefenseRank: 1,
      speedRank: 1,
    });
  });

  it('確率が外れたら何もしない', async () => {
    const effect = new TestAllStatsBoost10();
    const attacker = createBattlePokemonStatus();
    const defender = createBattlePokemonStatus({ id: 2 });
    const ctx = createBattleContext();

    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const result = await effect.onHit(attacker, defender, ctx);

    expect(result).toBeNull();
    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
    jest.restoreAllMocks();
  });

  it('既に全て上限のときは何もしない', async () => {
    const effect = new TestAllStatsBoost100();
    const attacker = createBattlePokemonStatus({
      attackRank: 6,
      defenseRank: 6,
      specialAttackRank: 6,
      specialDefenseRank: 6,
      speedRank: 6,
    });
    const defender = createBattlePokemonStatus({ id: 2 });
    const ctx = createBattleContext();

    const result = await effect.onHit(attacker, defender, ctx);

    expect(result).toBeNull();
    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });

  it('既存ランクから +1 し上限は6でクランプ', async () => {
    const effect = new TestAllStatsBoost100();
    const attacker = createBattlePokemonStatus({
      attackRank: 6,
      defenseRank: 3,
      specialAttackRank: 0,
      specialDefenseRank: -1,
      speedRank: 5,
    });
    const defender = createBattlePokemonStatus({ id: 2 });
    const ctx = createBattleContext();

    const result = await effect.onHit(attacker, defender, ctx);

    expect(result).toBe("user's stats rose!");
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(attacker.id, {
      attackRank: 6, // 既に6なのでそのまま
      defenseRank: 4,
      specialAttackRank: 1,
      specialDefenseRank: 0,
      speedRank: 6,
    });
  });

  it('battleRepository が無い場合は null', async () => {
    const effect = new TestAllStatsBoost100();
    const attacker = createBattlePokemonStatus();
    const defender = createBattlePokemonStatus({ id: 2 });
    const ctx: BattleContext = {
      battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    };

    const result = await effect.onHit(attacker, defender, ctx);

    expect(result).toBeNull();
  });
});
