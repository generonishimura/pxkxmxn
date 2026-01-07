import { TechnicianEffect } from './technician-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Weather, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('TechnicianEffect', () => {
  let effect: TechnicianEffect;
  let pokemon: BattlePokemonStatus;
  let battleContext: BattleContext;

  beforeEach(() => {
    effect = new TechnicianEffect();
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
      movePower: 60,
    };
  });

  describe('modifyDamageDealt', () => {
    it('should return 1.5x damage for moves with power 60', () => {
      const result = effect.modifyDamageDealt(pokemon, 100, battleContext);
      expect(result).toBe(150); // 100 * 1.5 = 150
    });

    it('should return 1.5x damage for moves with power less than 60', () => {
      const contextWithLowPower: BattleContext = {
        ...battleContext,
        movePower: 40,
      };
      const result = effect.modifyDamageDealt(pokemon, 100, contextWithLowPower);
      expect(result).toBe(150);
    });

    it('should return undefined for moves with power greater than 60', () => {
      const contextWithHighPower: BattleContext = {
        ...battleContext,
        movePower: 70,
      };
      const result = effect.modifyDamageDealt(pokemon, 100, contextWithHighPower);
      expect(result).toBeUndefined();
    });

    it('should return undefined when movePower is null', () => {
      const contextWithNullPower: BattleContext = {
        ...battleContext,
        movePower: null,
      };
      const result = effect.modifyDamageDealt(pokemon, 100, contextWithNullPower);
      expect(result).toBeUndefined();
    });

    it('should return undefined when movePower is not provided', () => {
      const contextWithoutPower: BattleContext = {
        ...battleContext,
        movePower: undefined,
      };
      const result = effect.modifyDamageDealt(pokemon, 100, contextWithoutPower);
      expect(result).toBeUndefined();
    });

    it('should return undefined when battleContext is not provided', () => {
      const result = effect.modifyDamageDealt(pokemon, 100, undefined);
      expect(result).toBeUndefined();
    });
  });
});
