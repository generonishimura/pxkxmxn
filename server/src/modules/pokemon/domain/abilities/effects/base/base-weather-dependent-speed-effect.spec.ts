import { BaseWeatherDependentSpeedEffect } from './base-weather-dependent-speed-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Weather, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

/**
 * テスト用の具象クラス（雨の時、速度2倍）
 */
class TestRainSpeedEffect extends BaseWeatherDependentSpeedEffect {
  protected readonly requiredWeathers = [Weather.Rain] as const;
  protected readonly speedMultiplier = 2.0;
}

/**
 * テスト用の具象クラス（晴れ・雨の時、速度1.5倍）
 */
class TestMultipleWeatherSpeedEffect extends BaseWeatherDependentSpeedEffect {
  protected readonly requiredWeathers = [Weather.Sun, Weather.Rain] as const;
  protected readonly speedMultiplier = 1.5;
}

describe('BaseWeatherDependentSpeedEffect', () => {
  let pokemon: BattlePokemonStatus;
  let battleContext: BattleContext;

  beforeEach(() => {
    pokemon = {
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

    battleContext = {
      battle: {
        id: 1,
        trainer1Id: 1,
        trainer2Id: 2,
        team1Id: 1,
        team2Id: 2,
        turn: 1,
        weather: Weather.Rain,
        field: null,
        status: BattleStatus.Active,
        winnerTrainerId: null,
      },
    };
  });

  describe('modifySpeed', () => {
    it('should return modified speed for required weather', () => {
      const effect = new TestRainSpeedEffect();
      const result = effect.modifySpeed(pokemon, 100, battleContext);
      expect(result).toBe(200); // 100 * 2.0 = 200
    });

    it('should return undefined for non-required weather', () => {
      const effect = new TestRainSpeedEffect();
      const contextWithoutRain: BattleContext = {
        ...battleContext,
        battle: {
          ...battleContext.battle,
          weather: Weather.Sun,
        },
      };
      const result = effect.modifySpeed(pokemon, 100, contextWithoutRain);
      expect(result).toBeUndefined();
    });

    it('should return undefined when weather is null', () => {
      const effect = new TestRainSpeedEffect();
      const contextWithoutWeather: BattleContext = {
        ...battleContext,
        battle: {
          ...battleContext.battle,
          weather: null,
        },
      };
      const result = effect.modifySpeed(pokemon, 100, contextWithoutWeather);
      expect(result).toBeUndefined();
    });

    it('should return undefined when battleContext is undefined', () => {
      const effect = new TestRainSpeedEffect();
      const result = effect.modifySpeed(pokemon, 100, undefined);
      expect(result).toBeUndefined();
    });

    it('should return modified speed for multiple required weathers', () => {
      const effect = new TestMultipleWeatherSpeedEffect();
      const contextWithSun: BattleContext = {
        ...battleContext,
        battle: {
          ...battleContext.battle,
          weather: Weather.Sun,
        },
      };
      const result = effect.modifySpeed(pokemon, 100, contextWithSun);
      expect(result).toBe(150); // 100 * 1.5 = 150
    });

    it('should floor the result', () => {
      const effect = new TestRainSpeedEffect();
      const result = effect.modifySpeed(pokemon, 99, battleContext);
      expect(result).toBe(198); // 99 * 2.0 = 198
    });
  });
});

