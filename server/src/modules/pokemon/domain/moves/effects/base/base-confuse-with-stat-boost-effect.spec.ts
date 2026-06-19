import { BaseConfuseWithStatBoostEffect } from './base-confuse-with-stat-boost-effect';
import { StatType } from './base-stat-change-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

class TestSwaggerLike extends BaseConfuseWithStatBoostEffect {
  protected readonly statType: StatType = 'attack';
  protected readonly rankChange = 2;
}

class TestFlatterLike extends BaseConfuseWithStatBoostEffect {
  protected readonly statType: StatType = 'specialAttack';
  protected readonly rankChange = 1;
}

describe('BaseConfuseWithStatBoostEffect', () => {
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

  describe('Swagger 相当（Attack +2 + こんらん）', () => {
    it('攻撃を+2上げてこんらんを付与する', async () => {
      const effect = new TestSwaggerLike();
      const attacker = createBattlePokemonStatus();
      const defender = createBattlePokemonStatus({ id: 2 });
      const ctx = createBattleContext();

      const result = await effect.onUse(attacker, defender, ctx);

      expect(result).toBe('Attack rose! became confused!');
      expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(defender.id, {
        attackRank: 2,
      });
      expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(defender.id, {
        statusCondition: StatusCondition.Confusion,
      });
    });

    it('攻撃ランクが上限の場合はランク変化メッセージなしでこんらんのみ付与', async () => {
      const effect = new TestSwaggerLike();
      const attacker = createBattlePokemonStatus();
      const defender = createBattlePokemonStatus({ id: 2, attackRank: 6 });
      const ctx = createBattleContext();

      const result = await effect.onUse(attacker, defender, ctx);

      expect(result).toBe('became confused!');
      expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(defender.id, {
        statusCondition: StatusCondition.Confusion,
      });
    });

    it('既に状態異常がある場合は能力上昇のみ実行', async () => {
      const effect = new TestSwaggerLike();
      const attacker = createBattlePokemonStatus();
      const defender = createBattlePokemonStatus({
        id: 2,
        statusCondition: StatusCondition.Burn,
      });
      const ctx = createBattleContext();

      const result = await effect.onUse(attacker, defender, ctx);

      expect(result).toBe('Attack rose!');
    });
  });

  describe('Flatter 相当（Special Attack +1 + こんらん）', () => {
    it('特攻を+1上げてこんらんを付与する', async () => {
      const effect = new TestFlatterLike();
      const attacker = createBattlePokemonStatus();
      const defender = createBattlePokemonStatus({ id: 2 });
      const ctx = createBattleContext();

      const result = await effect.onUse(attacker, defender, ctx);

      expect(result).toBe('Special Attack rose! became confused!');
      expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(defender.id, {
        specialAttackRank: 1,
      });
      expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(defender.id, {
        statusCondition: StatusCondition.Confusion,
      });
    });
  });

  it('battleRepository が無い場合は null', async () => {
    const effect = new TestSwaggerLike();
    const attacker = createBattlePokemonStatus();
    const defender = createBattlePokemonStatus({ id: 2 });
    const ctx: BattleContext = {
      battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    };

    const result = await effect.onUse(attacker, defender, ctx);

    expect(result).toBeNull();
  });
});
