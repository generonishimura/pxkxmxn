import { PainSplitEffect } from './pain-split-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('PainSplitEffect', () => {
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

  it('自分と相手の HP を平均値にする', async () => {
    const effect = new PainSplitEffect();
    const attacker = createBattlePokemonStatus({ currentHp: 20, maxHp: 100 });
    const defender = createBattlePokemonStatus({ id: 2, currentHp: 80, maxHp: 100 });
    const ctx = createBattleContext();

    const result = await effect.onUse(attacker, defender, ctx);

    expect(result).toBe('HP was averaged with the target!');
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(attacker.id, {
      currentHp: 50,
    });
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(defender.id, {
      currentHp: 50,
    });
  });

  it('一方の最大 HP を超えないようクランプ', async () => {
    const effect = new PainSplitEffect();
    const attacker = createBattlePokemonStatus({ currentHp: 100, maxHp: 100 });
    const defender = createBattlePokemonStatus({ id: 2, currentHp: 50, maxHp: 50 });
    const ctx = createBattleContext();

    const result = await effect.onUse(attacker, defender, ctx);

    expect(result).toBe('HP was averaged with the target!');
    // 平均は (100+50)/2 = 75 だが defender.maxHp=50 なので 50 にクランプ
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(attacker.id, {
      currentHp: 75,
    });
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(defender.id, {
      currentHp: 50,
    });
  });

  it('HP が同じなら何もしない', async () => {
    const effect = new PainSplitEffect();
    const attacker = createBattlePokemonStatus({ currentHp: 50, maxHp: 100 });
    const defender = createBattlePokemonStatus({ id: 2, currentHp: 50, maxHp: 100 });
    const ctx = createBattleContext();

    const result = await effect.onUse(attacker, defender, ctx);

    expect(result).toBeNull();
    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });
});
