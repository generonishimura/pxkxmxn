import { SheerForceEffect } from './sheer-force-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Weather, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('SheerForceEffect', () => {
  let effect: SheerForceEffect;
  let pokemon: BattlePokemonStatus;
  let battleContext: BattleContext;

  beforeEach(() => {
    effect = new SheerForceEffect();
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
      hasSecondaryEffect: true,
    };
  });

  describe('modifyDamageDealt', () => {
    it('should return 1.3x damage for moves with secondary effects', () => {
      const result = effect.modifyDamageDealt(pokemon, 100, battleContext);
      expect(result).toBe(130); // 100 * 1.3 = 130
    });

    it('should return undefined for moves without secondary effects', () => {
      const contextWithoutSecondary: BattleContext = {
        ...battleContext,
        hasSecondaryEffect: false,
      };
      const result = effect.modifyDamageDealt(pokemon, 100, contextWithoutSecondary);
      expect(result).toBeUndefined();
    });

    it('should return undefined when hasSecondaryEffect is not provided', () => {
      const contextWithoutSecondaryFlag: BattleContext = {
        ...battleContext,
        hasSecondaryEffect: undefined,
      };
      const result = effect.modifyDamageDealt(pokemon, 100, contextWithoutSecondaryFlag);
      expect(result).toBeUndefined();
    });

    it('should return undefined when battleContext is not provided', () => {
      const result = effect.modifyDamageDealt(pokemon, 100, undefined);
      expect(result).toBeUndefined();
    });
  });
});
