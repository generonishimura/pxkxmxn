import { WillOWispEffect } from './will-o-wisp-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('WillOWispEffect', () => {
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
    defenderPrimaryTypeName?: string;
    defenderSecondaryTypeName?: string | null;
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
          primaryType: { name: overrides?.defenderPrimaryTypeName ?? 'ノーマル' },
          secondaryType:
            overrides?.defenderSecondaryTypeName !== undefined
              ? overrides.defenderSecondaryTypeName
                ? { name: overrides.defenderSecondaryTypeName }
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

  it('相手に必ずやけどを付与する', async () => {
    const effect = new WillOWispEffect();
    const attacker = createBattlePokemonStatus();
    const defender = createBattlePokemonStatus({ id: 2 });
    const ctx = createBattleContext();

    const result = await effect.onHit(attacker, defender, ctx);

    expect(result).toBe('was burned!');
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(defender.id, {
      statusCondition: StatusCondition.Burn,
    });
  });

  it('ほのおタイプには付与しない', async () => {
    const effect = new WillOWispEffect();
    const attacker = createBattlePokemonStatus();
    const defender = createBattlePokemonStatus({ id: 2 });
    const ctx = createBattleContext({ defenderPrimaryTypeName: 'ほのお' });

    const result = await effect.onHit(attacker, defender, ctx);

    expect(result).toBeNull();
    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });

  it('既に状態異常がある場合は付与しない', async () => {
    const effect = new WillOWispEffect();
    const attacker = createBattlePokemonStatus();
    const defender = createBattlePokemonStatus({
      id: 2,
      statusCondition: StatusCondition.Paralysis,
    });
    const ctx = createBattleContext();

    const result = await effect.onHit(attacker, defender, ctx);

    expect(result).toBeNull();
    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });
});
