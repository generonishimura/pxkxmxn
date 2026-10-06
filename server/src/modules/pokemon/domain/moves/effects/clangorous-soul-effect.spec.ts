import { ClangorousSoulEffect } from './clangorous-soul-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('ClangorousSoulEffect', () => {
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

  it('最大 HP の 33% を支払い、攻撃・防御・特攻・特防・素早さを 1 段階ずつ上げる', async () => {
    // Arrange
    const effect = new ClangorousSoulEffect();
    const attacker = createBattlePokemonStatus({ currentHp: 100, maxHp: 100 });
    const defender = createBattlePokemonStatus({ id: 2 });
    const ctx = createBattleContext();

    // Act
    const result = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(result).toMatch(/cut its HP/);
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(attacker.id, {
      currentHp: 67,
      attackRank: 1,
      defenseRank: 1,
      specialAttackRank: 1,
      specialDefenseRank: 1,
      speedRank: 1,
    });
  });

  it('現在 HP が最大 HP の 33% 以下なら失敗する', async () => {
    // Arrange
    const effect = new ClangorousSoulEffect();
    const attacker = createBattlePokemonStatus({ currentHp: 33, maxHp: 100 });
    const defender = createBattlePokemonStatus({ id: 2 });
    const ctx = createBattleContext();

    // Act
    const result = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(result).toBeNull();
    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });

  it('支払う HP は最大 HP × 33 / 100 の切り捨て（最大 HP 300 なら 99）', async () => {
    // Arrange
    const effect = new ClangorousSoulEffect();
    const attacker = createBattlePokemonStatus({ currentHp: 300, maxHp: 300 });
    const defender = createBattlePokemonStatus({ id: 2 });
    const ctx = createBattleContext();

    // Act
    await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(attacker.id, {
      currentHp: 201,
      attackRank: 1,
      defenseRank: 1,
      specialAttackRank: 1,
      specialDefenseRank: 1,
      speedRank: 1,
    });
  });

  it('現在 HP が最大 HP の 33% を超えていれば成功する（最大 HP 300、現在 HP 100）', async () => {
    // Arrange
    const effect = new ClangorousSoulEffect();
    const attacker = createBattlePokemonStatus({ currentHp: 100, maxHp: 300 });
    const defender = createBattlePokemonStatus({ id: 2 });
    const ctx = createBattleContext();

    // Act
    await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(attacker.id, {
      currentHp: 1,
      attackRank: 1,
      defenseRank: 1,
      specialAttackRank: 1,
      specialDefenseRank: 1,
      speedRank: 1,
    });
  });

  it('支払う HP は最低 1（最大 HP 2 なら 1）', async () => {
    // Arrange
    const effect = new ClangorousSoulEffect();
    const attacker = createBattlePokemonStatus({ currentHp: 2, maxHp: 2 });
    const defender = createBattlePokemonStatus({ id: 2 });
    const ctx = createBattleContext();

    // Act
    await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(attacker.id, {
      currentHp: 1,
      attackRank: 1,
      defenseRank: 1,
      specialAttackRank: 1,
      specialDefenseRank: 1,
      speedRank: 1,
    });
  });

  it('最大 HP が 1 なら失敗する', async () => {
    // Arrange
    const effect = new ClangorousSoulEffect();
    const attacker = createBattlePokemonStatus({ currentHp: 1, maxHp: 1 });
    const defender = createBattlePokemonStatus({ id: 2 });
    const ctx = createBattleContext();

    // Act
    const result = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(result).toBeNull();
    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });

  it('5 つの能力が全て +6 なら失敗する', async () => {
    // Arrange
    const effect = new ClangorousSoulEffect();
    const attacker = createBattlePokemonStatus({
      attackRank: 6,
      defenseRank: 6,
      specialAttackRank: 6,
      specialDefenseRank: 6,
      speedRank: 6,
    });
    const defender = createBattlePokemonStatus({ id: 2 });
    const ctx = createBattleContext();

    // Act
    const result = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(result).toBeNull();
    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });

  it('一部の能力が +6 でも残りは上がり、上限の能力は +6 のまま', async () => {
    // Arrange
    const effect = new ClangorousSoulEffect();
    const attacker = createBattlePokemonStatus({ attackRank: 6 });
    const defender = createBattlePokemonStatus({ id: 2 });
    const ctx = createBattleContext();

    // Act
    await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(attacker.id, {
      currentHp: 67,
      attackRank: 6,
      defenseRank: 1,
      specialAttackRank: 1,
      specialDefenseRank: 1,
      speedRank: 1,
    });
  });
});
