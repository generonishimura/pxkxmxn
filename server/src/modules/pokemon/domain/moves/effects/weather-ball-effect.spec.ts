import { WeatherBallEffect } from './weather-ball-effect';
import { createBattleContext, createBattlePokemonStatus } from './__tests__/test-helpers';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';
import { BattleContext } from '../../abilities/battle-context.interface';

describe('WeatherBallEffect', () => {
  const effect = new WeatherBallEffect();
  const attacker = createBattlePokemonStatus({ id: 1 });
  const defender = createBattlePokemonStatus({ id: 2 });
  const contextWith = (weather: Weather | null): BattleContext => ({
    ...createBattleContext(),
    weather,
    movePower: 50,
  });

  describe('modifyMoveType', () => {
    it.each([
      [Weather.Sun, 'ほのお'],
      [Weather.Rain, 'みず'],
      [Weather.Sandstorm, 'いわ'],
      [Weather.Hail, 'こおり'],
    ])('天候が%sならタイプが%sになる', (weather, typeName) => {
      // Act
      const result = effect.modifyMoveType(attacker, defender, contextWith(weather));

      // Assert
      expect(result).toBe(typeName);
    });

    it.each([Weather.None, null])('天候が%sならタイプは変わらない', weather => {
      // Act
      const result = effect.modifyMoveType(attacker, defender, contextWith(weather));

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('modifyMovePower', () => {
    it.each([Weather.Sun, Weather.Rain, Weather.Sandstorm, Weather.Hail])(
      '天候が%sなら威力が2倍の100になる',
      weather => {
        // Act
        const power = effect.modifyMovePower(attacker, defender, contextWith(weather));

        // Assert
        expect(power).toBe(100);
      },
    );

    it.each([Weather.None, null])('天候が%sなら威力は変わらない', weather => {
      // Act
      const power = effect.modifyMovePower(attacker, defender, contextWith(weather));

      // Assert
      expect(power).toBeUndefined();
    });

    it('ノーてんきなどで天候が消えている（weather が None）なら、場の天候が雨でも威力・タイプは変わらない', () => {
      // Arrange
      const base = createBattleContext();
      const context: BattleContext = {
        ...base,
        battle: { ...base.battle, weather: Weather.Rain },
        weather: Weather.None,
        movePower: 50,
      };

      // Act
      const power = effect.modifyMovePower(attacker, defender, context);
      const typeName = effect.modifyMoveType(attacker, defender, context);

      // Assert
      expect(power).toBeUndefined();
      expect(typeName).toBeUndefined();
    });
  });
});
