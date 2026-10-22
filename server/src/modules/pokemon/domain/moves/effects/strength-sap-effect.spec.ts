import { StrengthSapEffect } from './strength-sap-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { Nature } from '@/modules/battle/domain/logic/stat-calculator';

describe('StrengthSapEffect', () => {
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

  /**
   * 相手の育成個体
   * 攻撃の実数値: floor((floor((2 * 100 + 31 + floor(0 / 4)) * 50 / 100) + 5) * 1.0) = 120
   */
  const defenderTrainedPokemon = {
    id: 2,
    level: 50,
    nature: Nature.Hardy,
    ability: null,
    pokemon: {
      baseHp: 100,
      baseAttack: 100,
      baseDefense: 100,
      baseSpecialAttack: 100,
      baseSpecialDefense: 100,
      baseSpeed: 100,
    },
    ivHp: 31,
    ivAttack: 31,
    ivDefense: 31,
    ivSpecialAttack: 31,
    ivSpecialDefense: 31,
    ivSpeed: 31,
    evHp: 0,
    evAttack: 0,
    evDefense: 0,
    evSpecialAttack: 0,
    evSpecialDefense: 0,
    evSpeed: 0,
  };

  const createBattleContext = (options?: { withTrainedPokemonRepository?: boolean }) => {
    const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);
    const mockBattleRepository = {
      updateBattlePokemonStatus: jest.fn().mockResolvedValue(undefined),
    };
    const mockTrainedPokemonRepository = {
      findById: jest.fn().mockResolvedValue(defenderTrainedPokemon),
    };
    const ctx: BattleContext = {
      battle,
      battleRepository: mockBattleRepository as unknown as BattleContext['battleRepository'],
      trainedPokemonRepository:
        options?.withTrainedPokemonRepository === false
          ? undefined
          : (mockTrainedPokemonRepository as unknown as BattleContext['trainedPokemonRepository']),
    };
    return { ctx, mockBattleRepository };
  };

  it('相手の攻撃の実数値だけ自分の HP を回復し、相手の攻撃を1段階下げる', async () => {
    // Arrange
    const effect = new StrengthSapEffect();
    const attacker = createBattlePokemonStatus({ currentHp: 50, maxHp: 300 });
    const defender = createBattlePokemonStatus({ id: 2, trainedPokemonId: 2 });
    const { ctx, mockBattleRepository } = createBattleContext();

    // Act
    const result = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(result).toBe('HP was restored! Attack fell!');
    expect(mockBattleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(attacker.id, {
      currentHp: 170,
    });
    expect(mockBattleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(defender.id, {
      attackRank: -1,
    });
  });

  it('相手の攻撃ランクの補正を反映した値だけ回復する', async () => {
    // Arrange
    const effect = new StrengthSapEffect();
    const attacker = createBattlePokemonStatus({ currentHp: 10, maxHp: 400 });
    const defender = createBattlePokemonStatus({ id: 2, trainedPokemonId: 2, attackRank: 1 });
    const { ctx, mockBattleRepository } = createBattleContext();

    // Act
    await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(mockBattleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(attacker.id, {
      currentHp: 190,
    });
    expect(mockBattleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(defender.id, {
      attackRank: 0,
    });
  });

  it('回復量は最大 HP を超えない', async () => {
    // Arrange
    const effect = new StrengthSapEffect();
    const attacker = createBattlePokemonStatus({ currentHp: 90, maxHp: 100 });
    const defender = createBattlePokemonStatus({ id: 2, trainedPokemonId: 2 });
    const { ctx, mockBattleRepository } = createBattleContext();

    // Act
    await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(mockBattleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(attacker.id, {
      currentHp: 100,
    });
  });

  it('自分の HP が満タンでも相手の攻撃は下げる', async () => {
    // Arrange
    const effect = new StrengthSapEffect();
    const attacker = createBattlePokemonStatus({ currentHp: 100, maxHp: 100 });
    const defender = createBattlePokemonStatus({ id: 2, trainedPokemonId: 2 });
    const { ctx, mockBattleRepository } = createBattleContext();

    // Act
    const result = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(result).toBe('Attack fell!');
    expect(mockBattleRepository.updateBattlePokemonStatus).toHaveBeenCalledTimes(1);
    expect(mockBattleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(defender.id, {
      attackRank: -1,
    });
  });

  it('相手の攻撃ランクが -6 なら失敗する', async () => {
    // Arrange
    const effect = new StrengthSapEffect();
    const attacker = createBattlePokemonStatus({ currentHp: 50, maxHp: 300 });
    const defender = createBattlePokemonStatus({ id: 2, trainedPokemonId: 2, attackRank: -6 });
    const { ctx, mockBattleRepository } = createBattleContext();

    // Act
    const result = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(result).toBeNull();
    expect(mockBattleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });

  it('育成個体を取得できなければ何もしない', async () => {
    // Arrange
    const effect = new StrengthSapEffect();
    const attacker = createBattlePokemonStatus({ currentHp: 50, maxHp: 300 });
    const defender = createBattlePokemonStatus({ id: 2, trainedPokemonId: 2 });
    const { ctx, mockBattleRepository } = createBattleContext({
      withTrainedPokemonRepository: false,
    });

    // Act
    const result = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(result).toBeNull();
    expect(mockBattleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });
});
