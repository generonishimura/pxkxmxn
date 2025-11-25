import { BaseTypeAbsorbEffect } from './base-type-absorb-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Weather, BattleStatus, Battle } from '@/modules/battle/domain/entities/battle.entity';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';

/**
 * テスト用の具象クラス（でんきタイプ無効化、最大HPの1/4回復）
 */
class TestElectricAbsorbEffect extends BaseTypeAbsorbEffect {
  protected readonly immuneTypes = ['でんき'] as const;
  protected readonly healRatio = 0.25;
}

describe('BaseTypeAbsorbEffect', () => {
  let pokemon: BattlePokemonStatus;
  let battleContext: BattleContext;
  let mockBattleRepository: jest.Mocked<IBattleRepository>;

  beforeEach(() => {
    pokemon = {
      id: 1,
      battleId: 1,
      trainedPokemonId: 1,
      trainerId: 1,
      isActive: true,
      currentHp: 50,
      maxHp: 100,
      attackRank: 0,
      defenseRank: 0,
      specialAttackRank: 0,
      specialDefenseRank: 0,
      speedRank: 0,
      accuracyRank: 0,
      evasionRank: 0,
      statusCondition: null,
    } as BattlePokemonStatus;

    mockBattleRepository = {
      findBattlePokemonStatusById: jest.fn().mockResolvedValue({
        ...pokemon,
        currentHp: 50,
      }),
      updateBattlePokemonStatus: jest.fn().mockResolvedValue(pokemon),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findBattlePokemonStatusByBattleId: jest.fn(),
      createBattlePokemonStatus: jest.fn(),
      findActivePokemonByBattleIdAndTrainerId: jest.fn(),
      findBattlePokemonMovesByBattlePokemonStatusId: jest.fn(),
      createBattlePokemonMove: jest.fn(),
      updateBattlePokemonMove: jest.fn(),
      findBattlePokemonMoveById: jest.fn(),
    } as jest.Mocked<IBattleRepository>;

    battleContext = {
      battle: new Battle(1, 1, 2, 1, 2, 1, Weather.None, null, BattleStatus.Active, null),
      battleRepository: mockBattleRepository,
      moveTypeName: 'でんき',
    };
  });

  describe('isImmuneToType', () => {
    it('should return true for immune type', () => {
      const effect = new TestElectricAbsorbEffect();
      const result = effect.isImmuneToType(pokemon, 'でんき', battleContext);
      expect(result).toBe(true);
    });

    it('should return false for non-immune type', () => {
      const effect = new TestElectricAbsorbEffect();
      const result = effect.isImmuneToType(pokemon, 'ほのお', battleContext);
      expect(result).toBe(false);
    });
  });

  describe('onAfterTakingDamage', () => {
    it('should heal HP when immune type attack is absorbed', async () => {
      const effect = new TestElectricAbsorbEffect();
      await effect.onAfterTakingDamage(pokemon, 0, battleContext);

      expect(mockBattleRepository.findBattlePokemonStatusById).toHaveBeenCalledWith(1);
      expect(mockBattleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
        currentHp: 75, // 50 + (100 * 0.25) = 75
      });
    });

    it('should not heal HP when non-immune type attack', async () => {
      const effect = new TestElectricAbsorbEffect();
      const contextWithFire: BattleContext = {
        ...battleContext,
        moveTypeName: 'ほのお',
      };
      await effect.onAfterTakingDamage(pokemon, 0, contextWithFire);

      expect(mockBattleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('should not heal HP when moveTypeName is undefined', async () => {
      const effect = new TestElectricAbsorbEffect();
      const contextWithoutType: BattleContext = {
        ...battleContext,
        moveTypeName: undefined,
      };
      await effect.onAfterTakingDamage(pokemon, 0, contextWithoutType);

      expect(mockBattleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('should not heal HP when battleRepository is undefined', async () => {
      const effect = new TestElectricAbsorbEffect();
      const contextWithoutRepository: BattleContext = {
        ...battleContext,
        battleRepository: undefined,
      };
      await effect.onAfterTakingDamage(pokemon, 0, contextWithoutRepository);

      expect(mockBattleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('should cap HP at maxHp', async () => {
      const effect = new TestElectricAbsorbEffect();
      const pokemonNearMaxHp = {
        ...pokemon,
        currentHp: 90,
        maxHp: 100,
      } as BattlePokemonStatus;
      mockBattleRepository.findBattlePokemonStatusById.mockResolvedValue(pokemonNearMaxHp);

      await effect.onAfterTakingDamage(pokemonNearMaxHp, 0, battleContext);

      expect(mockBattleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
        currentHp: 100, // 90 + 25 = 115 -> capped at 100
      });
    });

    it('should floor the heal amount', async () => {
      const effect = new TestElectricAbsorbEffect();
      const pokemonWithOddMaxHp = {
        ...pokemon,
        currentHp: 50,
        maxHp: 99, // 99 * 0.25 = 24.75 -> 24
      } as BattlePokemonStatus;
      mockBattleRepository.findBattlePokemonStatusById.mockResolvedValue(pokemonWithOddMaxHp);

      await effect.onAfterTakingDamage(pokemonWithOddMaxHp, 0, battleContext);

      expect(mockBattleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
        currentHp: 74, // 50 + 24 = 74
      });
    });
  });
});

