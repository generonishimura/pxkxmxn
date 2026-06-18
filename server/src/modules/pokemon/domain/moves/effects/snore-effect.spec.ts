import { SnoreEffect } from './snore-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('SnoreEffect', () => {
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
    const mockTrainedPokemonRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 1,
        pokemon: { id: 1, primaryType: { name: 'ノーマル' }, secondaryType: null },
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

  it('使用者が眠っているときは30%でひるみを付与する', async () => {
    const effect = new SnoreEffect();
    const attacker = createBattlePokemonStatus({ statusCondition: StatusCondition.Sleep });
    const defender = createBattlePokemonStatus({ id: 2 });
    const ctx = createBattleContext();

    jest.spyOn(Math, 'random').mockReturnValue(0.1); // 30% を通過

    const result = await effect.onHit(attacker, defender, ctx);

    expect(result).toBe('flinched!');
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(defender.id, {
      statusCondition: StatusCondition.Flinch,
    });

    jest.restoreAllMocks();
  });

  it.each([
    ['null', null],
    ['やけど', StatusCondition.Burn],
    ['まひ', StatusCondition.Paralysis],
    ['こおり', StatusCondition.Freeze],
  ])('使用者が眠っていない（%s）ときは発動しない', async (_label, condition) => {
    const effect = new SnoreEffect();
    const attacker = createBattlePokemonStatus({ statusCondition: condition });
    const defender = createBattlePokemonStatus({ id: 2 });
    const ctx = createBattleContext();

    jest.spyOn(Math, 'random').mockReturnValue(0.1);

    const result = await effect.onHit(attacker, defender, ctx);

    expect(result).toBeNull();
    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();

    jest.restoreAllMocks();
  });

  it('使用者が眠っていても30%を外したら付与しない', async () => {
    const effect = new SnoreEffect();
    const attacker = createBattlePokemonStatus({ statusCondition: StatusCondition.Sleep });
    const defender = createBattlePokemonStatus({ id: 2 });
    const ctx = createBattleContext();

    jest.spyOn(Math, 'random').mockReturnValue(0.5); // 30% を外す

    const result = await effect.onHit(attacker, defender, ctx);

    expect(result).toBeNull();
    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();

    jest.restoreAllMocks();
  });
});
