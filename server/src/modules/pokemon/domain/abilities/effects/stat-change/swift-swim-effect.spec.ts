import { SwiftSwimEffect } from './swift-swim-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Weather, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('SwiftSwimEffect', () => {
  let effect: SwiftSwimEffect;
  let pokemon: BattlePokemonStatus;
  let battleContext: BattleContext;

  beforeEach(() => {
    effect = new SwiftSwimEffect();
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
    it('should return doubled speed when weather is Rain', () => {
      const result = effect.modifySpeed(pokemon, 100, battleContext);
      expect(result).toBe(200); // 100 * 2.0 = 200
    });

    it('should return undefined when weather is not Rain', () => {
      const contextWithSun: BattleContext = {
        ...battleContext,
        battle: {
          ...battleContext.battle,
          weather: Weather.Sun,
        },
      };
      const result = effect.modifySpeed(pokemon, 100, contextWithSun);
      expect(result).toBeUndefined();
    });

    it('should return undefined when weather is None', () => {
      const contextWithNone: BattleContext = {
        ...battleContext,
        battle: {
          ...battleContext.battle,
          weather: Weather.None,
        },
      };
      const result = effect.modifySpeed(pokemon, 100, contextWithNone);
      expect(result).toBeUndefined();
    });

    it('should return undefined when weather is Sandstorm', () => {
      const contextWithSandstorm: BattleContext = {
        ...battleContext,
        battle: {
          ...battleContext.battle,
          weather: Weather.Sandstorm,
        },
      };
      const result = effect.modifySpeed(pokemon, 100, contextWithSandstorm);
      expect(result).toBeUndefined();
    });

    it('should return undefined when weather is Hail', () => {
      const contextWithHail: BattleContext = {
        ...battleContext,
        battle: {
          ...battleContext.battle,
          weather: Weather.Hail,
        },
      };
      const result = effect.modifySpeed(pokemon, 100, contextWithHail);
      expect(result).toBeUndefined();
    });

    it('should return undefined when weather is null', () => {
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

    it('should floor the result', () => {
      const result = effect.modifySpeed(pokemon, 99, battleContext);
      expect(result).toBe(198); // 99 * 2.0 = 198
    });
  });
});
