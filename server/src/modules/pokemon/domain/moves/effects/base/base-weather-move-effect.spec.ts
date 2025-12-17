import { BaseWeatherMoveEffect } from './base-weather-move-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../../abilities/battle-context.interface';
import { Weather, BattleStatus, Battle } from '@/modules/battle/domain/entities/battle.entity';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';

/**
 * テスト用の具象クラス（雨を降らせる）
 */
class TestRainWeatherMoveEffect extends BaseWeatherMoveEffect {
  protected readonly weather = Weather.Rain;
  protected readonly message = 'It started to rain!';
}

describe('BaseWeatherMoveEffect', () => {
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
      update: jest.fn().mockResolvedValue(
        new Battle(1, 1, 2, 1, 2, 1, Weather.Rain, null, BattleStatus.Active, null),
      ),
      findById: jest.fn(),
      create: jest.fn(),
      findBattlePokemonStatusByBattleId: jest.fn(),
      createBattlePokemonStatus: jest.fn(),
      updateBattlePokemonStatus: jest.fn(),
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
    it('should change weather when onUse is called', async () => {
      const effect = new TestRainWeatherMoveEffect();
      const result = await effect.onUse(attacker, defender, battleContext);

      expect(mockBattleRepository.update).toHaveBeenCalledWith(1, {
        weather: Weather.Rain,
      });
      expect(result).toBe('It started to rain!');
    });

    it('should not change weather when already the same weather', async () => {
      const effect = new TestRainWeatherMoveEffect();
      const contextWithRain: BattleContext = {
        ...battleContext,
        battle: {
          ...battleContext.battle,
          weather: Weather.Rain,
        },
      };
      const result = await effect.onUse(attacker, defender, contextWithRain);

      expect(mockBattleRepository.update).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should return null when battleRepository is undefined', async () => {
      const effect = new TestRainWeatherMoveEffect();
      const contextWithoutRepository: BattleContext = {
        ...battleContext,
        battleRepository: undefined,
      };
      const result = await effect.onUse(attacker, defender, contextWithoutRepository);

      expect(mockBattleRepository.update).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should change weather even if current weather is different', async () => {
      const effect = new TestRainWeatherMoveEffect();
      const contextWithSun: BattleContext = {
        ...battleContext,
        battle: {
          ...battleContext.battle,
          weather: Weather.Sun,
        },
      };
      const result = await effect.onUse(attacker, defender, contextWithSun);

      expect(mockBattleRepository.update).toHaveBeenCalledWith(1, {
        weather: Weather.Rain,
      });
      expect(result).toBe('It started to rain!');
    });
  });
});

