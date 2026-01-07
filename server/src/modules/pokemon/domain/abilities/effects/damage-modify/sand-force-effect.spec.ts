import { SandForceEffect } from './sand-force-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Weather, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('SandForceEffect', () => {
  let effect: SandForceEffect;
  let pokemon: BattlePokemonStatus;
  let battleContext: BattleContext;

  beforeEach(() => {
    effect = new SandForceEffect();
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
      moveTypeName: 'いわ',
    };
  });

  describe('modifyDamageDealt', () => {
    it('should return 1.3x damage for Rock type during Sandstorm', () => {
      const result = effect.modifyDamageDealt(pokemon, 100, battleContext);
      expect(result).toBe(130); // 100 * 1.3 = 130
    });

    it('should return 1.3x damage for Ground type during Sandstorm', () => {
      const contextWithGround: BattleContext = {
        ...battleContext,
        moveTypeName: 'じめん',
      };
      const result = effect.modifyDamageDealt(pokemon, 100, contextWithGround);
      expect(result).toBe(130);
    });

    it('should return 1.3x damage for Steel type during Sandstorm', () => {
      const contextWithSteel: BattleContext = {
        ...battleContext,
        moveTypeName: 'はがね',
      };
      const result = effect.modifyDamageDealt(pokemon, 100, contextWithSteel);
      expect(result).toBe(130);
    });

    it('should return undefined for non-affected type during Sandstorm', () => {
      const contextWithFire: BattleContext = {
        ...battleContext,
        moveTypeName: 'ほのお',
      };
      const result = effect.modifyDamageDealt(pokemon, 100, contextWithFire);
      expect(result).toBeUndefined();
    });

    it('should return undefined when weather is not Sandstorm', () => {
      const contextWithRain: BattleContext = {
        ...battleContext,
        battle: {
          ...battleContext.battle,
          weather: Weather.Rain,
        },
      };
      const result = effect.modifyDamageDealt(pokemon, 100, contextWithRain);
      expect(result).toBeUndefined();
    });

    it('should return undefined when moveTypeName is not provided', () => {
      const contextWithoutType: BattleContext = {
        ...battleContext,
        moveTypeName: undefined,
      };
      const result = effect.modifyDamageDealt(pokemon, 100, contextWithoutType);
      expect(result).toBeUndefined();
    });

    it('should return undefined when battleContext is not provided', () => {
      const result = effect.modifyDamageDealt(pokemon, 100, undefined);
      expect(result).toBeUndefined();
    });
  });
});
