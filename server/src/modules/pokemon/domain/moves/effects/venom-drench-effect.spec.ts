import { VenomDrenchEffect } from './venom-drench-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

describe('VenomDrenchEffect', () => {
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

  it('どく状態の相手の攻撃・特攻・素早さを 1 段階ずつ下げる', async () => {
    // Arrange
    const effect = new VenomDrenchEffect();
    const attacker = createBattlePokemonStatus();
    const defender = createBattlePokemonStatus({ id: 2, statusCondition: StatusCondition.Poison });
    const ctx = createBattleContext();

    // Act
    const result = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(result).toBe('Attack fell! Special Attack fell! Speed fell!');
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(defender.id, {
      attackRank: -1,
      specialAttackRank: -1,
      speedRank: -1,
    });
  });

  it('もうどく状態の相手にも効果がある', async () => {
    // Arrange
    const effect = new VenomDrenchEffect();
    const attacker = createBattlePokemonStatus();
    const defender = createBattlePokemonStatus({
      id: 2,
      statusCondition: StatusCondition.BadPoison,
    });
    const ctx = createBattleContext();

    // Act
    const result = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(result).toBe('Attack fell! Special Attack fell! Speed fell!');
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledTimes(1);
  });

  it.each([null, StatusCondition.None, StatusCondition.Burn])(
    '相手の状態が %s なら失敗する',
    async statusCondition => {
      // Arrange
      const effect = new VenomDrenchEffect();
      const attacker = createBattlePokemonStatus();
      const defender = createBattlePokemonStatus({ id: 2, statusCondition });
      const ctx = createBattleContext();

      // Act
      const result = await effect.onUse(attacker, defender, ctx);

      // Assert
      expect(result).toBeNull();
      expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
    },
  );
});
