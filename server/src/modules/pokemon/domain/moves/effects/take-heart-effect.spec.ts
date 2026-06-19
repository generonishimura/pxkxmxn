import { TakeHeartEffect } from './take-heart-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('TakeHeartEffect', () => {
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

  it('状態異常を治癒し、特攻と特防を +1 する', async () => {
    const effect = new TakeHeartEffect();
    const attacker = createBattlePokemonStatus({ statusCondition: StatusCondition.Burn });
    const defender = createBattlePokemonStatus({ id: 2 });
    const ctx = createBattleContext();

    const result = await effect.onUse(attacker, defender, ctx);

    expect(result).toContain('cured of its status');
    expect(result).toContain('Special Attack rose!');
    expect(result).toContain('Special Defense rose!');
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(attacker.id, {
      statusCondition: StatusCondition.None,
      specialAttackRank: 1,
      specialDefenseRank: 1,
    });
  });

  it('状態異常が無い場合は能力上昇のみ', async () => {
    const effect = new TakeHeartEffect();
    const attacker = createBattlePokemonStatus({ statusCondition: null });
    const defender = createBattlePokemonStatus({ id: 2 });
    const ctx = createBattleContext();

    const result = await effect.onUse(attacker, defender, ctx);

    expect(result).not.toContain('cured');
    expect(result).toContain('Special Attack rose!');
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(attacker.id, {
      specialAttackRank: 1,
      specialDefenseRank: 1,
    });
  });

  it('能力が既に上限で状態異常も無いなら null', async () => {
    const effect = new TakeHeartEffect();
    const attacker = createBattlePokemonStatus({
      statusCondition: null,
      specialAttackRank: 6,
      specialDefenseRank: 6,
    });
    const defender = createBattlePokemonStatus({ id: 2 });
    const ctx = createBattleContext();

    const result = await effect.onUse(attacker, defender, ctx);

    expect(result).toBeNull();
    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });
});
