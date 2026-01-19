import { SparklingAriaEffect } from './sparkling-aria-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('SparklingAriaEffect', () => {
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

  const createBattleContext = (overrides?: {
    battleRepository?: BattleContext['battleRepository'] | null;
  }): BattleContext => {
    const battle = new Battle(
      1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null,
    );
    const mockBattleRepository = {
      updateBattlePokemonStatus: jest.fn().mockResolvedValue(undefined),
    };
    const battleRepository =
      overrides && 'battleRepository' in overrides
        ? overrides.battleRepository
        : mockBattleRepository;
    return {
      battle,
      battleRepository: battleRepository as BattleContext['battleRepository'],
    };
  };

  it('やけどを回復し statusCondition を None に更新する', async () => {
    const effect = new SparklingAriaEffect();
    const attacker = createBattlePokemonStatus();
    const defender = createBattlePokemonStatus({ statusCondition: StatusCondition.Burn });
    const ctx = createBattleContext();

    const result = await effect.onHit(attacker, defender, ctx);

    expect(result).toBe("target's burn was cured!");
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(defender.id, {
      statusCondition: StatusCondition.None,
    });
  });

  it('やけどでない場合は何もしない', async () => {
    const effect = new SparklingAriaEffect();
    const attacker = createBattlePokemonStatus();
    const defender = createBattlePokemonStatus({ statusCondition: StatusCondition.Poison });
    const ctx = createBattleContext();

    const result = await effect.onHit(attacker, defender, ctx);

    expect(result).toBeNull();
    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });

  it('状態異常がない場合も何もしない', async () => {
    const effect = new SparklingAriaEffect();
    const attacker = createBattlePokemonStatus();
    const defender = createBattlePokemonStatus({ statusCondition: null });
    const ctx = createBattleContext();

    const result = await effect.onHit(attacker, defender, ctx);

    expect(result).toBeNull();
    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });

  it('battleRepository が無い場合は null', async () => {
    const effect = new SparklingAriaEffect();
    const attacker = createBattlePokemonStatus();
    const defender = createBattlePokemonStatus({ statusCondition: StatusCondition.Burn });
    const ctx = createBattleContext({ battleRepository: undefined });

    const result = await effect.onHit(attacker, defender, ctx);

    expect(result).toBeNull();
  });
});
