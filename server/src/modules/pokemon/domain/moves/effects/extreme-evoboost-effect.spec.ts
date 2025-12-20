import { ExtremeEvoboostEffect } from './extreme-evoboost-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { Weather, BattleStatus, Battle } from '@/modules/battle/domain/entities/battle.entity';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';

describe('ExtremeEvoboostEffect', () => {
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
      attackRank: 0,
      defenseRank: 0,
      specialAttackRank: 0,
      specialDefenseRank: 0,
      speedRank: 0,
      accuracyRank: 0,
      evasionRank: 0,
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
      updateBattlePokemonStatus: jest.fn().mockResolvedValue(attacker),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findBattlePokemonStatusByBattleId: jest.fn(),
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
    it('should increase all stat ranks by 2', async () => {
      const effect = new ExtremeEvoboostEffect();
      const result = await effect.onUse(attacker, defender, battleContext);

      expect(mockBattleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
        attackRank: 2,
        defenseRank: 2,
        specialAttackRank: 2,
        specialDefenseRank: 2,
        speedRank: 2,
        accuracyRank: 2,
        evasionRank: 2,
      });
      expect(result).toBe('All stats sharply rose!');
    });

    it('should cap stat ranks at 6', async () => {
      attacker = {
        ...attacker,
        attackRank: 5,
        defenseRank: 5,
        specialAttackRank: 5,
        specialDefenseRank: 5,
        speedRank: 5,
        accuracyRank: 5,
        evasionRank: 5,
      } as BattlePokemonStatus;

      const effect = new ExtremeEvoboostEffect();
      const result = await effect.onUse(attacker, defender, battleContext);

      expect(mockBattleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
        attackRank: 6,
        defenseRank: 6,
        specialAttackRank: 6,
        specialDefenseRank: 6,
        speedRank: 6,
        accuracyRank: 6,
        evasionRank: 6,
      });
      expect(result).toBe('All stats sharply rose!');
    });

    it('should return null if battleRepository is not provided', async () => {
      const effect = new ExtremeEvoboostEffect();
      const contextWithoutRepository: BattleContext = {
        battle: battleContext.battle,
      };
      const result = await effect.onUse(attacker, defender, contextWithoutRepository);

      expect(result).toBeNull();
      expect(mockBattleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });
  });
});

