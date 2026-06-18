import { WakeUpSlapEffect } from './wake-up-slap-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('WakeUpSlapEffect', () => {
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

  it('眠り中の相手のねむり状態を解除する', async () => {
    const effect = new WakeUpSlapEffect();
    const attacker = createBattlePokemonStatus();
    const defender = createBattlePokemonStatus({ id: 2, statusCondition: StatusCondition.Sleep });
    const ctx = createBattleContext();

    const result = await effect.onHit(attacker, defender, ctx);

    expect(result).toBe('target woke up!');
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(defender.id, {
      statusCondition: StatusCondition.None,
    });
  });

  it.each([
    ['やけど', StatusCondition.Burn],
    ['まひ', StatusCondition.Paralysis],
    ['どく', StatusCondition.Poison],
    ['こおり', StatusCondition.Freeze],
    [null, null],
  ])('眠り以外の状態（%s）では何もしない', async (_label, condition) => {
    const effect = new WakeUpSlapEffect();
    const attacker = createBattlePokemonStatus();
    const defender = createBattlePokemonStatus({ id: 2, statusCondition: condition });
    const ctx = createBattleContext();

    const result = await effect.onHit(attacker, defender, ctx);

    expect(result).toBeNull();
    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });

  it('battleRepository が無い場合は null を返す', async () => {
    const effect = new WakeUpSlapEffect();
    const attacker = createBattlePokemonStatus();
    const defender = createBattlePokemonStatus({ id: 2, statusCondition: StatusCondition.Sleep });
    const ctx: BattleContext = {
      battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    };

    const result = await effect.onHit(attacker, defender, ctx);

    expect(result).toBeNull();
  });
});
