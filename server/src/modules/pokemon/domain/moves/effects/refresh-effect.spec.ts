import { RefreshEffect } from './refresh-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('RefreshEffect', () => {
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

  it.each([
    ['やけど', StatusCondition.Burn],
    ['まひ', StatusCondition.Paralysis],
    ['どく', StatusCondition.Poison],
    ['もうどく', StatusCondition.BadPoison],
  ])('自分の%s状態を回復する', async (_label, condition) => {
    const effect = new RefreshEffect();
    const attacker = createBattlePokemonStatus({ statusCondition: condition });
    const defender = createBattlePokemonStatus({ id: 2 });
    const ctx = createBattleContext();

    const result = await effect.onUse(attacker, defender, ctx);

    expect(result).toBe('The user was cured of its status condition!');
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(attacker.id, {
      statusCondition: StatusCondition.None,
    });
  });

  it.each([
    ['ねむり', StatusCondition.Sleep],
    ['こおり', StatusCondition.Freeze],
    ['こんらん', StatusCondition.Confusion],
  ])('対象外の%s状態は回復しない', async (_label, condition) => {
    const effect = new RefreshEffect();
    const attacker = createBattlePokemonStatus({ statusCondition: condition });
    const defender = createBattlePokemonStatus({ id: 2 });
    const ctx = createBattleContext();

    const result = await effect.onUse(attacker, defender, ctx);

    expect(result).toBeNull();
    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });

  it('状態異常がない場合は何もしない', async () => {
    const effect = new RefreshEffect();
    const attacker = createBattlePokemonStatus({ statusCondition: null });
    const defender = createBattlePokemonStatus({ id: 2 });
    const ctx = createBattleContext();

    const result = await effect.onUse(attacker, defender, ctx);

    expect(result).toBeNull();
    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });
});
