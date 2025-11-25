import { VoltAbsorbEffect } from './volt-absorb-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Weather, BattleStatus, Battle } from '@/modules/battle/domain/entities/battle.entity';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';

describe('VoltAbsorbEffect', () => {
  let effect: VoltAbsorbEffect;
  let pokemon: BattlePokemonStatus;
  let battleContext: BattleContext;
  let mockBattleRepository: jest.Mocked<IBattleRepository>;

  beforeEach(() => {
    effect = new VoltAbsorbEffect();
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
    it('should return true for Electric type', () => {
      const result = effect.isImmuneToType(pokemon, 'でんき', battleContext);
      expect(result).toBe(true);
    });

    it('should return false for other types', () => {
      expect(effect.isImmuneToType(pokemon, 'ほのお', battleContext)).toBe(false);
      expect(effect.isImmuneToType(pokemon, 'みず', battleContext)).toBe(false);
      expect(effect.isImmuneToType(pokemon, 'じめん', battleContext)).toBe(false);
    });
  });

  describe('onAfterTakingDamage', () => {
    it('should heal HP by 1/4 of max HP when Electric type attack is absorbed', async () => {
      await effect.onAfterTakingDamage(pokemon, 0, battleContext);

      expect(mockBattleRepository.findBattlePokemonStatusById).toHaveBeenCalledWith(1);
      expect(mockBattleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
        currentHp: 75, // 50 + (100 * 0.25) = 75
      });
    });

    it('should not heal HP when non-Electric type attack', async () => {
      const contextWithFire: BattleContext = {
        ...battleContext,
        moveTypeName: 'ほのお',
      };
      await effect.onAfterTakingDamage(pokemon, 0, contextWithFire);

      expect(mockBattleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('should cap HP at maxHp', async () => {
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
  });
});

