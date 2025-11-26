import { BaseWeatherDependentDamageEffect } from './base-weather-dependent-damage-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Weather, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

/**
 * テスト用の具象クラス（砂嵐の時、ダメージ1.5倍）
 */
class TestSandstormDamageEffect extends BaseWeatherDependentDamageEffect {
  protected readonly requiredWeathers = [Weather.Sandstorm] as const;
  protected readonly damageMultiplier = 1.5;
}

/**
 * テスト用の具象クラス（晴れ・雨の時、ダメージ0.5倍）
 */
class TestMultipleWeatherDamageEffect extends BaseWeatherDependentDamageEffect {
  protected readonly requiredWeathers = [Weather.Sun, Weather.Rain] as const;
  protected readonly damageMultiplier = 0.5;
}

describe('BaseWeatherDependentDamageEffect', () => {
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
        weather: Weather.Sandstorm,
        field: null,
        status: BattleStatus.Active,
        winnerTrainerId: null,
      },
    };
  });

  describe('modifyDamageDealt', () => {
    it('指定された天候の場合、ダメージが1.5倍になる', () => {
      const effect = new TestSandstormDamageEffect();
      const result = effect.modifyDamageDealt(pokemon, 100, battleContext);
      expect(result).toBe(150); // 100 * 1.5 = 150
    });

    it('指定された天候でない場合、undefinedを返す', () => {
      const effect = new TestSandstormDamageEffect();
      const contextWithoutSandstorm: BattleContext = {
        ...battleContext,
        battle: {
          ...battleContext.battle,
          weather: Weather.Sun,
        },
      };
      const result = effect.modifyDamageDealt(pokemon, 100, contextWithoutSandstorm);
      expect(result).toBeUndefined();
    });

    it('天候がnullの場合、undefinedを返す', () => {
      const effect = new TestSandstormDamageEffect();
      const contextWithoutWeather: BattleContext = {
        ...battleContext,
        battle: {
          ...battleContext.battle,
          weather: null,
        },
      };
      const result = effect.modifyDamageDealt(pokemon, 100, contextWithoutWeather);
      expect(result).toBeUndefined();
    });

    it('battleContextがない場合、undefinedを返す', () => {
      const effect = new TestSandstormDamageEffect();
      const result = effect.modifyDamageDealt(pokemon, 100, undefined);
      expect(result).toBeUndefined();
    });

    it('複数の天候が指定されている場合、いずれかの天候で発動する', () => {
      const effect = new TestMultipleWeatherDamageEffect();
      const contextWithSun: BattleContext = {
        ...battleContext,
        battle: {
          ...battleContext.battle,
          weather: Weather.Sun,
        },
      };
      const result = effect.modifyDamageDealt(pokemon, 100, contextWithSun);
      expect(result).toBe(50); // 100 * 0.5 = 50
    });

    it('battleContext.weatherが優先される', () => {
      const effect = new TestSandstormDamageEffect();
      const contextWithWeather: BattleContext = {
        ...battleContext,
        weather: Weather.Sandstorm,
        battle: {
          ...battleContext.battle,
          weather: Weather.Sun,
        },
      };
      const result = effect.modifyDamageDealt(pokemon, 100, contextWithWeather);
      expect(result).toBe(150); // battleContext.weatherが優先される
    });

    it('ダメージが小数になる場合、切り捨てられる', () => {
      const effect = new TestSandstormDamageEffect();
      const result = effect.modifyDamageDealt(pokemon, 99, battleContext);
      expect(result).toBe(148); // 99 * 1.5 = 148.5 -> 148
    });
  });
});

