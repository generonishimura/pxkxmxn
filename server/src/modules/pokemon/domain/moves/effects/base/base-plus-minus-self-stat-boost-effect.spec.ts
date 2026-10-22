import { BasePlusMinusSelfStatBoostEffect } from './base-plus-minus-self-stat-boost-effect';
import { StatType } from './base-stat-change-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

class TestGearUp extends BasePlusMinusSelfStatBoostEffect {
  protected readonly statChanges: ReadonlyArray<{ statType: StatType; rankChange: number }> = [
    { statType: 'attack', rankChange: 1 },
    { statType: 'specialAttack', rankChange: 1 },
  ];
}

describe('BasePlusMinusSelfStatBoostEffect', () => {
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

  const createBattleContext = (attackerAbilityName: string | null): BattleContext => {
    const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);
    const mockBattleRepository = {
      updateBattlePokemonStatus: jest.fn().mockResolvedValue(undefined),
      // かがくへんかガスの判定で、場のポケモンを引く
      findBattlePokemonStatusByBattleId: jest.fn().mockResolvedValue([]),
    };
    const mockTrainedPokemonRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 1,
        pokemon: { id: 1, primaryType: { name: 'でんき' }, secondaryType: null },
        ability: attackerAbilityName ? { id: 1, name: attackerAbilityName } : null,
      }),
    };
    return {
      battle,
      battleRepository: mockBattleRepository as unknown as BattleContext['battleRepository'],
      trainedPokemonRepository:
        mockTrainedPokemonRepository as unknown as BattleContext['trainedPokemonRepository'],
    };
  };

  it.each(['プラス', 'マイナス'])(
    '自分の特性が%sのとき、指定した能力が上がる',
    async abilityName => {
      // Arrange
      const effect = new TestGearUp();
      const attacker = createBattlePokemonStatus({ id: 1 });
      const defender = createBattlePokemonStatus({ id: 2, trainedPokemonId: 2 });
      const ctx = createBattleContext(abilityName);

      // Act
      const result = await effect.onUse(attacker, defender, ctx);

      // Assert
      expect(result).toBe('Attack rose! Special Attack rose!');
      expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(attacker.id, {
        attackRank: 1,
        specialAttackRank: 1,
      });
    },
  );

  it('自分の特性がプラス・マイナス以外のときは失敗し、null を返す', async () => {
    // Arrange
    const effect = new TestGearUp();
    const attacker = createBattlePokemonStatus({ id: 1 });
    const defender = createBattlePokemonStatus({ id: 2, trainedPokemonId: 2 });
    const ctx = createBattleContext('せいでんき');

    // Act
    const result = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(result).toBeNull();
    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });

  it('自分に特性が無いときは失敗し、null を返す', async () => {
    // Arrange
    const effect = new TestGearUp();
    const attacker = createBattlePokemonStatus({ id: 1 });
    const defender = createBattlePokemonStatus({ id: 2, trainedPokemonId: 2 });
    const ctx = createBattleContext(null);

    // Act
    const result = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(result).toBeNull();
    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });

  it('自分の育成ポケモン情報を attacker.trainedPokemonId で取得する', async () => {
    // Arrange
    const effect = new TestGearUp();
    const attacker = createBattlePokemonStatus({ id: 1, trainedPokemonId: 42 });
    const defender = createBattlePokemonStatus({ id: 2, trainedPokemonId: 2 });
    const ctx = createBattleContext('プラス');

    // Act
    await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(ctx.trainedPokemonRepository?.findById).toHaveBeenCalledWith(42);
  });

  it('trainedPokemonRepository が無い場合は null を返す', async () => {
    // Arrange
    const effect = new TestGearUp();
    const ctx: BattleContext = {
      battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
      battleRepository: {
        updateBattlePokemonStatus: jest.fn(),
      } as unknown as BattleContext['battleRepository'],
    };

    // Act
    const result = await effect.onUse(
      createBattlePokemonStatus({ id: 1 }),
      createBattlePokemonStatus({ id: 2 }),
      ctx,
    );

    // Assert
    expect(result).toBeNull();
    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });
});
