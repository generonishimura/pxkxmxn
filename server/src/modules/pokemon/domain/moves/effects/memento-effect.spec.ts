import { MementoEffect } from './memento-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('MementoEffect', () => {
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

  it('相手の攻撃・特攻を -2、自分は瀕死', async () => {
    const effect = new MementoEffect();
    const attacker = createBattlePokemonStatus({ currentHp: 100, maxHp: 100 });
    const defender = createBattlePokemonStatus({ id: 2, attackRank: 0, specialAttackRank: 0 });
    const ctx = createBattleContext();

    const result = await effect.onUse(attacker, defender, ctx);

    expect(result).toBe("target's Attack and Special Attack fell! User fainted!");
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(defender.id, {
      attackRank: -2,
      specialAttackRank: -2,
    });
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(attacker.id, {
      currentHp: 0,
    });
  });

  it('相手の能力ランクが既に -6 でも自分は瀕死する', async () => {
    const effect = new MementoEffect();
    const attacker = createBattlePokemonStatus({ currentHp: 50, maxHp: 100 });
    const defender = createBattlePokemonStatus({
      id: 2,
      attackRank: -6,
      specialAttackRank: -6,
    });
    const ctx = createBattleContext();

    const result = await effect.onUse(attacker, defender, ctx);

    expect(result).toBe("target's Attack and Special Attack fell! User fainted!");
    // 相手の能力は既に下限のため変更されない
    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalledWith(
      defender.id,
      expect.objectContaining({ attackRank: expect.any(Number) }),
    );
    // 自分は瀕死する
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(attacker.id, {
      currentHp: 0,
    });
  });

  it('-6 でクランプ', async () => {
    const effect = new MementoEffect();
    const attacker = createBattlePokemonStatus();
    const defender = createBattlePokemonStatus({
      id: 2,
      attackRank: -5,
      specialAttackRank: -5,
    });
    const ctx = createBattleContext();

    await effect.onUse(attacker, defender, ctx);

    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(defender.id, {
      attackRank: -6,
      specialAttackRank: -6,
    });
  });
});
