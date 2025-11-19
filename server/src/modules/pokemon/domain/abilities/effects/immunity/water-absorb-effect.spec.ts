import { WaterAbsorbEffect } from './water-absorb-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Weather, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';

describe('WaterAbsorbEffect', () => {
  let effect: WaterAbsorbEffect;
  let pokemon: BattlePokemonStatus;
  let battleContext: BattleContext;
  let mockBattleRepository: jest.Mocked<IBattleRepository>;

  beforeEach(() => {
    effect = new WaterAbsorbEffect();
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
    } as any;

    battleContext = {
      battle: {
        id: 1,
        trainer1Id: 1,
        trainer2Id: 2,
        team1Id: 1,
        team2Id: 2,
        turn: 1,
        weather: Weather.None,
        field: null,
        status: BattleStatus.Active,
        winnerTrainerId: null,
      },
      battleRepository: mockBattleRepository,
      moveTypeName: 'みず',
    };
  });

  describe('isImmuneToType', () => {
    it('should return true for Water type', () => {
      const result = effect.isImmuneToType(pokemon, 'みず', battleContext);
      expect(result).toBe(true);
    });

    it('should return false for other types', () => {
      expect(effect.isImmuneToType(pokemon, 'ほのお', battleContext)).toBe(false);
      expect(effect.isImmuneToType(pokemon, 'でんき', battleContext)).toBe(false);
    });
  });

  describe('onAfterTakingDamage', () => {
    it('should heal HP by 1/4 of max HP when Water type attack is absorbed', async () => {
      await effect.onAfterTakingDamage(pokemon, 0, battleContext);

      expect(mockBattleRepository.findBattlePokemonStatusById).toHaveBeenCalledWith(1);
      expect(mockBattleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
        currentHp: 75, // 50 + (100 * 0.25) = 75
      });
    });
  });
});

