import { NoRetreatEffect } from './no-retreat-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { Move, MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { Type } from '@/modules/pokemon/domain/entities/type.entity';

describe('NoRetreatEffect', () => {
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

  const createMove = (): Move => {
    return {
      id: 1,
      name: 'はいすいのじん',
      nameEn: 'no-retreat',
      type: { id: 1, name: 'はがね' } as Type,
      category: 'Physical' as MoveCategory,
      power: 60,
      accuracy: 100,
      pp: 5,
      priority: 0,
      description: null,
    } as Move;
  };

  it('beforeDamage で multiHitCount を 2 に設定する', async () => {
    const effect = new NoRetreatEffect();
    const attacker = createBattlePokemonStatus();
    const defender = createBattlePokemonStatus({ id: 2 });
    const ctx = createBattleContext();
    const move = createMove();

    await effect.beforeDamage(attacker, defender, move, ctx);

    expect(ctx.multiHitCount).toBe(2);
  });

  it('onHit で相手にひるみを付与する', async () => {
    const effect = new NoRetreatEffect();
    const attacker = createBattlePokemonStatus();
    const defender = createBattlePokemonStatus({ id: 2 });
    const ctx = createBattleContext();

    const result = await effect.onHit(attacker, defender, ctx);

    expect(result).toBe('flinched!');
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(defender.id, {
      statusCondition: StatusCondition.Flinch,
    });
  });

  it('既に状態異常がある場合はひるみを付与しない', async () => {
    const effect = new NoRetreatEffect();
    const attacker = createBattlePokemonStatus();
    const defender = createBattlePokemonStatus({ id: 2, statusCondition: StatusCondition.Burn });
    const ctx = createBattleContext();

    const result = await effect.onHit(attacker, defender, ctx);

    expect(result).toBeNull();
    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });

  it('battleRepository が無い場合は null', async () => {
    const effect = new NoRetreatEffect();
    const attacker = createBattlePokemonStatus();
    const defender = createBattlePokemonStatus({ id: 2 });
    const ctx: BattleContext = {
      battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    };

    const result = await effect.onHit(attacker, defender, ctx);

    expect(result).toBeNull();
  });
});
