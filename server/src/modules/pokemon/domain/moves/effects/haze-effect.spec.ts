import { HazeEffect } from './haze-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { Weather, BattleStatus, Battle } from '@/modules/battle/domain/entities/battle.entity';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';

describe('HazeEffect', () => {
  let attacker: BattlePokemonStatus;
  let defender: BattlePokemonStatus;
  let battleContext: BattleContext;
  let mockBattleRepository: jest.Mocked<IBattleRepository>;

  beforeEach(() => {
    attacker = {
      id: 1,
      battleId: 1,
      trainedPokemonId: 1,
      trainerId: 1,
      isActive: true,
      currentHp: 100,
      maxHp: 100,
      attackRank: 2,
      defenseRank: -1,
      specialAttackRank: 3,
      specialDefenseRank: 0,
      speedRank: 1,
      accuracyRank: -2,
      evasionRank: 1,
      statusCondition: null,
    } as BattlePokemonStatus;

    defender = {
      id: 2,
      battleId: 1,
      trainedPokemonId: 2,
      trainerId: 2,
      isActive: true,
      currentHp: 100,
      maxHp: 100,
      attackRank: -2,
      defenseRank: 3,
      specialAttackRank: -1,
      specialDefenseRank: 2,
      speedRank: -1,
      accuracyRank: 1,
      evasionRank: -2,
      statusCondition: null,
    } as BattlePokemonStatus;

    mockBattleRepository = {
      updateBattlePokemonStatus: jest.fn().mockResolvedValue(attacker),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findBattlePokemonStatusByBattleId: jest.fn().mockResolvedValue([attacker, defender]),
      createBattlePokemonStatus: jest.fn(),
      findActivePokemonByBattleIdAndTrainerId: jest.fn(),
      findBattlePokemonStatusById: jest.fn(),
      findBattlePokemonMovesByBattlePokemonStatusId: jest.fn(),
      createBattlePokemonMove: jest.fn(),
      updateBattlePokemonMove: jest.fn(),
      findBattlePokemonMoveById: jest.fn(),
    } as jest.Mocked<IBattleRepository>;

    battleContext = {
      battle: new Battle(1, 1, 2, 1, 2, 1, Weather.None, null, BattleStatus.Active, null),
      battleRepository: mockBattleRepository,
    };
  });

  describe('onUse', () => {
    it('should reset all stat ranks to 0 for all pokemon', async () => {
      const effect = new HazeEffect();
      const result = await effect.onUse(attacker, defender, battleContext);

      expect(mockBattleRepository.findBattlePokemonStatusByBattleId).toHaveBeenCalledWith(1);
      expect(mockBattleRepository.updateBattlePokemonStatus).toHaveBeenCalledTimes(2);
      expect(mockBattleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
        attackRank: 0,
        defenseRank: 0,
        specialAttackRank: 0,
        specialDefenseRank: 0,
        speedRank: 0,
        accuracyRank: 0,
        evasionRank: 0,
      });
      expect(mockBattleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(2, {
        attackRank: 0,
        defenseRank: 0,
        specialAttackRank: 0,
        specialDefenseRank: 0,
        speedRank: 0,
        accuracyRank: 0,
        evasionRank: 0,
      });
      expect(result).toBe('All stat changes were eliminated!');
    });

    it('should return null if battleRepository is not provided', async () => {
      const effect = new HazeEffect();
      const contextWithoutRepository: BattleContext = {
        battle: battleContext.battle,
      };
      const result = await effect.onUse(attacker, defender, contextWithoutRepository);

      expect(result).toBeNull();
      expect(mockBattleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });
  });
});

