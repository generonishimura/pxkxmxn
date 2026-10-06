import { BaseSelfHealEffect, HealFraction } from './base-self-heal-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../../abilities/battle-context.interface';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';
import { createBattleContext, createBattlePokemonStatus } from '../__tests__/test-helpers';

/**
 * テスト用の具象クラス（最大 HP の 1/2 を回復）
 */
class TestHalfHealEffect extends BaseSelfHealEffect {
  protected getHealFraction(): HealFraction {
    return { numerator: 1, denominator: 2 };
  }
}

describe('BaseSelfHealEffect', () => {
  const createContext = (): BattleContext => {
    const battleRepository = {
      updateBattlePokemonStatus: jest.fn().mockResolvedValue(undefined),
    } as unknown as IBattleRepository;
    return createBattleContext({ battleRepository });
  };

  const createDefender = (): BattlePokemonStatus => createBattlePokemonStatus({ id: 2 });

  it('最大 HP の 1/2 を回復する', async () => {
    // Arrange
    const effect = new TestHalfHealEffect();
    const attacker = createBattlePokemonStatus({ currentHp: 30, maxHp: 100 });
    const ctx = createContext();

    // Act
    const result = await effect.onUse(attacker, createDefender(), ctx);

    // Assert
    expect(result).toBe('user restored its HP!');
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(attacker.id, {
      currentHp: 80,
    });
  });

  it('回復量は切り捨てで計算する', async () => {
    // Arrange
    const effect = new TestHalfHealEffect();
    const attacker = createBattlePokemonStatus({ currentHp: 10, maxHp: 101 });
    const ctx = createContext();

    // Act
    await effect.onUse(attacker, createDefender(), ctx);

    // Assert
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(attacker.id, {
      currentHp: 60,
    });
  });

  it('回復後の HP は最大 HP を超えない', async () => {
    // Arrange
    const effect = new TestHalfHealEffect();
    const attacker = createBattlePokemonStatus({ currentHp: 90, maxHp: 100 });
    const ctx = createContext();

    // Act
    await effect.onUse(attacker, createDefender(), ctx);

    // Assert
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(attacker.id, {
      currentHp: 100,
    });
  });

  it('最大 HP が 1 でも回復量は最低 1 になる', async () => {
    // Arrange
    const effect = new TestHalfHealEffect();
    const attacker = createBattlePokemonStatus({ currentHp: 0, maxHp: 1 });
    const ctx = createContext();

    // Act
    await effect.onUse(attacker, createDefender(), ctx);

    // Assert
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(attacker.id, {
      currentHp: 1,
    });
  });

  it('HP が満タンなら失敗し、HP を更新しない', async () => {
    // Arrange
    const effect = new TestHalfHealEffect();
    const attacker = createBattlePokemonStatus({ currentHp: 100, maxHp: 100 });
    const ctx = createContext();

    // Act
    const result = await effect.onUse(attacker, createDefender(), ctx);

    // Assert
    expect(result).toBeNull();
    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });

  it('バトルリポジトリがなければ何もしない', async () => {
    // Arrange
    const effect = new TestHalfHealEffect();
    const attacker = createBattlePokemonStatus({ currentHp: 30, maxHp: 100 });
    const ctx = createBattleContext();

    // Act
    const result = await effect.onUse(attacker, createDefender(), ctx);

    // Assert
    expect(result).toBeNull();
  });
});
