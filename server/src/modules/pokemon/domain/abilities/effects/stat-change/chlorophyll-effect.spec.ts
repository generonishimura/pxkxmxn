import { ChlorophyllEffect } from './chlorophyll-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Weather, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('ChlorophyllEffect', () => {
  let effect: ChlorophyllEffect;
  let pokemon: BattlePokemonStatus;
  let battleContext: BattleContext;

  beforeEach(() => {
    effect = new ChlorophyllEffect();
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
        weather: Weather.Sun,
        field: null,
        status: BattleStatus.Active,
        winnerTrainerId: null,
      },
    };
  });

  describe('modifySpeed', () => {
    it('should return doubled speed in Sun weather', () => {
      const result = effect.modifySpeed(pokemon, 100, battleContext);
      expect(result).toBe(200); // 100 * 2.0 = 200
    });

    it('should return undefined for non-Sun weather', () => {
      const contextWithRain: BattleContext = {
        ...battleContext,
        battle: {
          ...battleContext.battle,
          weather: Weather.Rain,
        },
      };
      const result = effect.modifySpeed(pokemon, 100, contextWithRain);
      expect(result).toBeUndefined();
    });
  });
});

