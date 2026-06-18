import { ToxicThreadEffect } from './toxic-thread-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('ToxicThreadEffect', () => {
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
    defenderPrimaryType?: string;
    defenderSecondaryType?: string | null;
  }): BattleContext => {
    const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);
    const mockBattleRepository = {
      updateBattlePokemonStatus: jest.fn().mockResolvedValue(undefined),
    };
    const mockTrainedPokemonRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 1,
        pokemon: {
          id: 1,
          primaryType: { name: overrides?.defenderPrimaryType ?? 'むし' },
          secondaryType:
            overrides?.defenderSecondaryType !== undefined
              ? overrides.defenderSecondaryType
                ? { name: overrides.defenderSecondaryType }
                : null
              : null,
        },
        ability: null,
      }),
    };
    return {
      battle,
      battleRepository: mockBattleRepository as unknown as BattleContext['battleRepository'],
      trainedPokemonRepository:
        mockTrainedPokemonRepository as unknown as BattleContext['trainedPokemonRepository'],
    };
  };

  it('どくを付与しすばやさを1段階下げる', async () => {
    const effect = new ToxicThreadEffect();
    const attacker = createBattlePokemonStatus();
    const defender = createBattlePokemonStatus({ id: 2 });
    const ctx = createBattleContext();

    const result = await effect.onUse(attacker, defender, ctx);

    expect(result).toBe('was poisoned! Speed fell!');
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(defender.id, {
      statusCondition: StatusCondition.Poison,
    });
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(defender.id, {
      speedRank: -1,
    });
  });

  it.each([
    ['どく', 'どく'],
    ['はがね', 'はがね'],
  ])('%sタイプにはどくを付与せず、すばやさのみ下げる', async (_label, typeName) => {
    const effect = new ToxicThreadEffect();
    const attacker = createBattlePokemonStatus();
    const defender = createBattlePokemonStatus({ id: 2 });
    const ctx = createBattleContext({ defenderPrimaryType: typeName });

    const result = await effect.onUse(attacker, defender, ctx);

    expect(result).toBe('Speed fell!');
    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalledWith(defender.id, {
      statusCondition: StatusCondition.Poison,
    });
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(defender.id, {
      speedRank: -1,
    });
  });

  it('既に状態異常がある場合はどくを付与せず、すばやさのみ下げる', async () => {
    const effect = new ToxicThreadEffect();
    const attacker = createBattlePokemonStatus();
    const defender = createBattlePokemonStatus({ id: 2, statusCondition: StatusCondition.Burn });
    const ctx = createBattleContext();

    const result = await effect.onUse(attacker, defender, ctx);

    expect(result).toBe('Speed fell!');
    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalledWith(defender.id, {
      statusCondition: StatusCondition.Poison,
    });
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(defender.id, {
      speedRank: -1,
    });
  });

  it('すばやさが既に -6 のときは下げない（どくのみ付与）', async () => {
    const effect = new ToxicThreadEffect();
    const attacker = createBattlePokemonStatus();
    const defender = createBattlePokemonStatus({ id: 2, speedRank: -6 });
    const ctx = createBattleContext();

    const result = await effect.onUse(attacker, defender, ctx);

    expect(result).toBe('was poisoned!');
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(defender.id, {
      statusCondition: StatusCondition.Poison,
    });
    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalledWith(defender.id, {
      speedRank: expect.any(Number),
    });
  });

  it('battleRepository が無い場合は null', async () => {
    const effect = new ToxicThreadEffect();
    const attacker = createBattlePokemonStatus();
    const defender = createBattlePokemonStatus({ id: 2 });
    const ctx: BattleContext = {
      battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    };

    const result = await effect.onUse(attacker, defender, ctx);

    expect(result).toBeNull();
  });
});
