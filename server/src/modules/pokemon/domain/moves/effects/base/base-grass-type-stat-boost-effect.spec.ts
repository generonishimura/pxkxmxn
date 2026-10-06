import { BaseGrassTypeStatBoostEffect } from './base-grass-type-stat-boost-effect';
import { StatType } from './base-stat-change-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

class TestRototiller extends BaseGrassTypeStatBoostEffect {
  protected readonly statChanges: ReadonlyArray<{ statType: StatType; rankChange: number }> = [
    { statType: 'attack', rankChange: 1 },
    { statType: 'specialAttack', rankChange: 1 },
  ];
}

describe('BaseGrassTypeStatBoostEffect', () => {
  const ATTACKER_TRAINED_POKEMON_ID = 10;
  const DEFENDER_TRAINED_POKEMON_ID = 20;

  const createBattlePokemonStatus = (
    overrides?: Partial<BattlePokemonStatus>,
  ): BattlePokemonStatus =>
    new BattlePokemonStatus(
      overrides?.id ?? 1,
      overrides?.battleId ?? 1,
      overrides?.trainedPokemonId ?? ATTACKER_TRAINED_POKEMON_ID,
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

  type Types = { primary: string; secondary?: string | null };

  const createBattleContext = (attackerTypes: Types, defenderTypes: Types): BattleContext => {
    const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);
    const mockBattleRepository = {
      updateBattlePokemonStatus: jest.fn().mockResolvedValue(undefined),
    };
    const toTrainedPokemon = (id: number, types: Types) => ({
      id,
      pokemon: {
        id,
        primaryType: { name: types.primary },
        secondaryType: types.secondary ? { name: types.secondary } : null,
      },
      ability: null,
    });
    const mockTrainedPokemonRepository = {
      findById: jest.fn().mockImplementation((id: number) => {
        if (id === ATTACKER_TRAINED_POKEMON_ID) {
          return Promise.resolve(toTrainedPokemon(id, attackerTypes));
        }
        if (id === DEFENDER_TRAINED_POKEMON_ID) {
          return Promise.resolve(toTrainedPokemon(id, defenderTypes));
        }
        return Promise.resolve(null);
      }),
    };
    return {
      battle,
      battleRepository: mockBattleRepository as unknown as BattleContext['battleRepository'],
      trainedPokemonRepository:
        mockTrainedPokemonRepository as unknown as BattleContext['trainedPokemonRepository'],
    };
  };

  const createAttacker = (overrides?: Partial<BattlePokemonStatus>) =>
    createBattlePokemonStatus({
      id: 1,
      trainedPokemonId: ATTACKER_TRAINED_POKEMON_ID,
      ...overrides,
    });
  const createDefender = (overrides?: Partial<BattlePokemonStatus>) =>
    createBattlePokemonStatus({
      id: 2,
      trainedPokemonId: DEFENDER_TRAINED_POKEMON_ID,
      ...overrides,
    });

  it('自分だけがくさタイプのとき、自分の能力だけが上がる', async () => {
    // Arrange
    const effect = new TestRototiller();
    const attacker = createAttacker();
    const defender = createDefender();
    const ctx = createBattleContext({ primary: 'くさ' }, { primary: 'ほのお' });

    // Act
    const result = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(result).toBe("user's Attack rose! user's Special Attack rose!");
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledTimes(1);
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(attacker.id, {
      attackRank: 1,
      specialAttackRank: 1,
    });
  });

  it('相手だけがくさタイプ（第2タイプ）のとき、相手の能力だけが上がる', async () => {
    // Arrange
    const effect = new TestRototiller();
    const attacker = createAttacker();
    const defender = createDefender();
    const ctx = createBattleContext({ primary: 'みず' }, { primary: 'どく', secondary: 'くさ' });

    // Act
    const result = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(result).toBe("target's Attack rose! target's Special Attack rose!");
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledTimes(1);
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(defender.id, {
      attackRank: 1,
      specialAttackRank: 1,
    });
  });

  it('両方がくさタイプのとき、両方の能力が上がる', async () => {
    // Arrange
    const effect = new TestRototiller();
    const attacker = createAttacker();
    const defender = createDefender({ attackRank: 2 });
    const ctx = createBattleContext({ primary: 'くさ' }, { primary: 'くさ' });

    // Act
    const result = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(result).toBe(
      "user's Attack rose! user's Special Attack rose! target's Attack rose! target's Special Attack rose!",
    );
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(attacker.id, {
      attackRank: 1,
      specialAttackRank: 1,
    });
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(defender.id, {
      attackRank: 3,
      specialAttackRank: 1,
    });
  });

  it('どちらもくさタイプでないときは失敗し、null を返す', async () => {
    // Arrange
    const effect = new TestRototiller();
    const attacker = createAttacker();
    const defender = createDefender();
    const ctx = createBattleContext(
      { primary: 'ほのお' },
      { primary: 'みず', secondary: 'ひこう' },
    );

    // Act
    const result = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(result).toBeNull();
    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });

  it('くさタイプの能力の一部が既に +6 なら、上がる能力だけを反映する', async () => {
    // Arrange
    const effect = new TestRototiller();
    const attacker = createAttacker({ attackRank: 6 });
    const defender = createDefender();
    const ctx = createBattleContext({ primary: 'くさ' }, { primary: 'ほのお' });

    // Act
    const result = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(result).toBe("user's Special Attack rose!");
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(attacker.id, {
      specialAttackRank: 1,
    });
  });

  it('くさタイプの能力がすべて +6 なら null を返す', async () => {
    // Arrange
    const effect = new TestRototiller();
    const attacker = createAttacker({ attackRank: 6, specialAttackRank: 6 });
    const defender = createDefender();
    const ctx = createBattleContext({ primary: 'くさ' }, { primary: 'ほのお' });

    // Act
    const result = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(result).toBeNull();
    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });

  it('trainedPokemonRepository が無い場合は null を返す', async () => {
    // Arrange
    const effect = new TestRototiller();
    const ctx: BattleContext = {
      battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
      battleRepository: {
        updateBattlePokemonStatus: jest.fn(),
      } as unknown as BattleContext['battleRepository'],
    };

    // Act
    const result = await effect.onUse(createAttacker(), createDefender(), ctx);

    // Assert
    expect(result).toBeNull();
    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });

  it('battleRepository が無い場合は null を返す', async () => {
    // Arrange
    const effect = new TestRototiller();
    const ctx: BattleContext = {
      battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    };

    // Act
    const result = await effect.onUse(createAttacker(), createDefender(), ctx);

    // Assert
    expect(result).toBeNull();
  });
});
