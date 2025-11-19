import { ThickFatEffect } from './thick-fat-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Weather, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('ThickFatEffect', () => {
  let effect: ThickFatEffect;
  let pokemon: BattlePokemonStatus;
  let battleContext: BattleContext;

  beforeEach(() => {
    effect = new ThickFatEffect();
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
        weather: Weather.None,
        field: null,
        status: BattleStatus.Active,
        winnerTrainerId: null,
      },
      moveTypeName: 'ほのお',
    };
  });

  describe('modifyDamage', () => {
    it('should return halved damage for Fire type', () => {
      const result = effect.modifyDamage(pokemon, 100, battleContext);
      expect(result).toBe(50); // 100 * 0.5 = 50
    });

    it('should return halved damage for Ice type', () => {
      const contextWithIce: BattleContext = {
        ...battleContext,
        moveTypeName: 'こおり',
      };
      const result = effect.modifyDamage(pokemon, 100, contextWithIce);
      expect(result).toBe(50); // 100 * 0.5 = 50
    });

    it('should return original damage for other types', () => {
      const contextWithWater: BattleContext = {
        ...battleContext,
        moveTypeName: 'みず',
      };
      const result = effect.modifyDamage(pokemon, 100, contextWithWater);
      expect(result).toBe(100);
    });

    it('should return original damage when moveTypeName is undefined', () => {
      const contextWithoutType: BattleContext = {
        ...battleContext,
        moveTypeName: undefined,
      };
      const result = effect.modifyDamage(pokemon, 100, contextWithoutType);
      expect(result).toBe(100);
    });

    it('should return original damage when battleContext is undefined', () => {
      const result = effect.modifyDamage(pokemon, 100, undefined);
      expect(result).toBe(100);
    });

    it('should floor the result', () => {
      const result = effect.modifyDamage(pokemon, 99, battleContext);
      expect(result).toBe(49); // 99 * 0.5 = 49.5 -> 49
    });
  });
});

