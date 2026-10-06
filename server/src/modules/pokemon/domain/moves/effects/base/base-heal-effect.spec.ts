import { BaseHealEffect, HealFraction, HealTarget } from './base-heal-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../../abilities/battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * テスト用の具象クラス（自分の HP を 1/4 回復）
 */
class TestSelfHealEffect extends BaseHealEffect {
  protected readonly healTarget: HealTarget = 'self';
  protected readonly healFraction: HealFraction = { numerator: 1, denominator: 4 };
}

/**
 * テスト用の具象クラス（自分の HP を 1/4 回復し、状態異常も治す）
 */
class TestSelfHealAndCureEffect extends BaseHealEffect {
  protected readonly healTarget: HealTarget = 'self';
  protected readonly healFraction: HealFraction = { numerator: 1, denominator: 4 };
  protected readonly curesStatusCondition = true;
}

/**
 * テスト用の具象クラス（相手の HP を 1/2 回復）
 */
class TestTargetHealEffect extends BaseHealEffect {
  protected readonly healTarget: HealTarget = 'target';
  protected readonly healFraction: HealFraction = { numerator: 1, denominator: 2 };
}

describe('BaseHealEffect', () => {
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
      overrides?.volatileState,
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

  describe('自分を回復する技', () => {
    it('最大 HP の 1/4 （四捨五入）だけ自分の HP を回復する', async () => {
      // Arrange
      const effect = new TestSelfHealEffect();
      const attacker = createBattlePokemonStatus({ currentHp: 50, maxHp: 103 });
      const defender = createBattlePokemonStatus({ id: 2 });
      const ctx = createBattleContext();

      // Act
      const result = await effect.onUse(attacker, defender, ctx);

      // Assert
      expect(result).toBe('HP was restored!');
      expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(attacker.id, {
        currentHp: 76,
      });
    });

    it('回復量は最大 HP を超えない', async () => {
      // Arrange
      const effect = new TestSelfHealEffect();
      const attacker = createBattlePokemonStatus({ currentHp: 90, maxHp: 100 });
      const defender = createBattlePokemonStatus({ id: 2 });
      const ctx = createBattleContext();

      // Act
      await effect.onUse(attacker, defender, ctx);

      // Assert
      expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(attacker.id, {
        currentHp: 100,
      });
    });

    it('最大 HP が小さくても最低 1 は回復する', async () => {
      // Arrange
      const effect = new TestSelfHealEffect();
      const attacker = createBattlePokemonStatus({ currentHp: 1, maxHp: 3 });
      const defender = createBattlePokemonStatus({ id: 2 });
      const ctx = createBattleContext();

      // Act
      await effect.onUse(attacker, defender, ctx);

      // Assert
      expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(attacker.id, {
        currentHp: 2,
      });
    });

    it('HP が満タンなら失敗する', async () => {
      // Arrange
      const effect = new TestSelfHealEffect();
      const attacker = createBattlePokemonStatus({ currentHp: 100, maxHp: 100 });
      const defender = createBattlePokemonStatus({ id: 2 });
      const ctx = createBattleContext();

      // Act
      const result = await effect.onUse(attacker, defender, ctx);

      // Assert
      expect(result).toBeNull();
      expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('状態異常を治さない技は状態異常を変更しない', async () => {
      // Arrange
      const effect = new TestSelfHealEffect();
      const attacker = createBattlePokemonStatus({
        currentHp: 50,
        statusCondition: StatusCondition.Burn,
      });
      const defender = createBattlePokemonStatus({ id: 2 });
      const ctx = createBattleContext();

      // Act
      await effect.onUse(attacker, defender, ctx);

      // Assert
      expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(attacker.id, {
        currentHp: 75,
      });
    });

    it('battleRepository がなければ何もしない', async () => {
      // Arrange
      const effect = new TestSelfHealEffect();
      const attacker = createBattlePokemonStatus({ currentHp: 50 });
      const defender = createBattlePokemonStatus({ id: 2 });
      const ctx: BattleContext = { battle: createBattleContext().battle };

      // Act
      const result = await effect.onUse(attacker, defender, ctx);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('自分を回復し状態異常も治す技', () => {
    it('HP を回復し、状態異常を治す', async () => {
      // Arrange
      const effect = new TestSelfHealAndCureEffect();
      const attacker = createBattlePokemonStatus({
        currentHp: 50,
        statusCondition: StatusCondition.Paralysis,
      });
      const defender = createBattlePokemonStatus({ id: 2 });
      const ctx = createBattleContext();

      // Act
      const result = await effect.onUse(attacker, defender, ctx);

      // Assert
      expect(result).toBe('HP was restored! Status condition was cured!');
      expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(attacker.id, {
        currentHp: 75,
        statusCondition: StatusCondition.None,
      });
    });

    it('HP が満タンでも状態異常があれば状態異常だけを治す', async () => {
      // Arrange
      const effect = new TestSelfHealAndCureEffect();
      const attacker = createBattlePokemonStatus({
        currentHp: 100,
        statusCondition: StatusCondition.Sleep,
      });
      const defender = createBattlePokemonStatus({ id: 2 });
      const ctx = createBattleContext();

      // Act
      const result = await effect.onUse(attacker, defender, ctx);

      // Assert
      expect(result).toBe('Status condition was cured!');
      expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(attacker.id, {
        statusCondition: StatusCondition.None,
      });
    });

    it('かいふくふうじ中は、HP は回復せず状態異常だけを治す', async () => {
      // Arrange
      const effect = new TestSelfHealAndCureEffect();
      const attacker = createBattlePokemonStatus({
        currentHp: 50,
        statusCondition: StatusCondition.Paralysis,
        volatileState: { healBlockTurns: 2 },
      });
      const defender = createBattlePokemonStatus({ id: 2 });
      const ctx = createBattleContext();

      // Act
      const result = await effect.onUse(attacker, defender, ctx);

      // Assert
      expect(result).toBe('Status condition was cured!');
      expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(attacker.id, {
        statusCondition: StatusCondition.None,
      });
    });

    it('HP が満タンで状態異常もなければ失敗する', async () => {
      // Arrange
      const effect = new TestSelfHealAndCureEffect();
      const attacker = createBattlePokemonStatus({ currentHp: 100, statusCondition: null });
      const defender = createBattlePokemonStatus({ id: 2 });
      const ctx = createBattleContext();

      // Act
      const result = await effect.onUse(attacker, defender, ctx);

      // Assert
      expect(result).toBeNull();
      expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('こんらんは状態異常（やけど・まひ等）ではないので治さない', async () => {
      // Arrange
      const effect = new TestSelfHealAndCureEffect();
      const attacker = createBattlePokemonStatus({
        currentHp: 100,
        statusCondition: StatusCondition.Confusion,
      });
      const defender = createBattlePokemonStatus({ id: 2 });
      const ctx = createBattleContext();

      // Act
      const result = await effect.onUse(attacker, defender, ctx);

      // Assert
      expect(result).toBeNull();
      expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });
  });

  describe('相手を回復する技', () => {
    it('相手の HP を最大 HP の 1/2 （四捨五入）回復する', async () => {
      // Arrange
      const effect = new TestTargetHealEffect();
      const attacker = createBattlePokemonStatus({ currentHp: 10 });
      const defender = createBattlePokemonStatus({ id: 2, currentHp: 20, maxHp: 101 });
      const ctx = createBattleContext();

      // Act
      const result = await effect.onUse(attacker, defender, ctx);

      // Assert
      expect(result).toBe("The target's HP was restored!");
      expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledTimes(1);
      expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(defender.id, {
        currentHp: 71,
      });
    });

    it('相手がかいふくふうじ中なら、回復せずに失敗する', async () => {
      // Arrange
      const effect = new TestTargetHealEffect();
      const attacker = createBattlePokemonStatus();
      const defender = createBattlePokemonStatus({
        id: 2,
        currentHp: 30,
        volatileState: { healBlockTurns: 2 },
      });
      const ctx = createBattleContext();

      // Act
      const result = await effect.onUse(attacker, defender, ctx);

      // Assert
      expect(result).toBeNull();
      expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('相手の HP が満タンなら失敗する', async () => {
      // Arrange
      const effect = new TestTargetHealEffect();
      const attacker = createBattlePokemonStatus({ currentHp: 10 });
      const defender = createBattlePokemonStatus({ id: 2, currentHp: 100, maxHp: 100 });
      const ctx = createBattleContext();

      // Act
      const result = await effect.onUse(attacker, defender, ctx);

      // Assert
      expect(result).toBeNull();
      expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('相手がひんしなら失敗する', async () => {
      // Arrange
      const effect = new TestTargetHealEffect();
      const attacker = createBattlePokemonStatus();
      const defender = createBattlePokemonStatus({ id: 2, currentHp: 0, maxHp: 100 });
      const ctx = createBattleContext();

      // Act
      const result = await effect.onUse(attacker, defender, ctx);

      // Assert
      expect(result).toBeNull();
      expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });
  });
});
