import { FlashFireEffect } from './flash-fire-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Weather, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('FlashFireEffect', () => {
  let effect: FlashFireEffect;
  let pokemon: BattlePokemonStatus;
  let battleContext: BattleContext;

  beforeEach(() => {
    effect = new FlashFireEffect();
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

  describe('isImmuneToType', () => {
    it('should return true for Fire type', () => {
      const result = effect.isImmuneToType(pokemon, 'ほのお', battleContext);
      expect(result).toBe(true);
    });

    it('should return false for other types', () => {
      expect(effect.isImmuneToType(pokemon, 'みず', battleContext)).toBe(false);
      expect(effect.isImmuneToType(pokemon, 'でんき', battleContext)).toBe(false);
      expect(effect.isImmuneToType(pokemon, 'じめん', battleContext)).toBe(false);
    });
  });

  describe('modifyDamageDealt', () => {
    it('should return 1.5x damage for Fire type', () => {
      const result = effect.modifyDamageDealt(pokemon, 100, battleContext);
      expect(result).toBe(150); // 100 * 1.5 = 150
    });

    it('should return undefined for non-Fire type', () => {
      const contextWithWater: BattleContext = {
        ...battleContext,
        moveTypeName: 'みず',
      };
      const result = effect.modifyDamageDealt(pokemon, 100, contextWithWater);
      expect(result).toBeUndefined();
    });

    it('should return undefined when moveTypeName is undefined', () => {
      const contextWithoutType: BattleContext = {
        ...battleContext,
        moveTypeName: undefined,
      };
      const result = effect.modifyDamageDealt(pokemon, 100, contextWithoutType);
      expect(result).toBeUndefined();
    });

    it('should return undefined when battleContext is undefined', () => {
      const result = effect.modifyDamageDealt(pokemon, 100, undefined);
      expect(result).toBeUndefined();
    });

    it('should floor the result', () => {
      const result = effect.modifyDamageDealt(pokemon, 99, battleContext);
      expect(result).toBe(148); // 99 * 1.5 = 148.5 -> 148
    });
  });
});

