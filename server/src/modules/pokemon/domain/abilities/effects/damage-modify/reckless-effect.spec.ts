import { RecklessEffect } from './reckless-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Weather, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('RecklessEffect', () => {
  let effect: RecklessEffect;
  let pokemon: BattlePokemonStatus;
  let battleContext: BattleContext;

  beforeEach(() => {
    effect = new RecklessEffect();
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
      hasRecoil: true,
    };
  });

  describe('modifyDamageDealt', () => {
    it('should return 1.2x damage for moves with recoil', () => {
      const result = effect.modifyDamageDealt(pokemon, 100, battleContext);
      expect(result).toBe(120); // 100 * 1.2 = 120
    });

    it('should return undefined for moves without recoil', () => {
      const contextWithoutRecoil: BattleContext = {
        ...battleContext,
        hasRecoil: false,
      };
      const result = effect.modifyDamageDealt(pokemon, 100, contextWithoutRecoil);
      expect(result).toBeUndefined();
    });

    it('should return undefined when hasRecoil is not provided', () => {
      const contextWithoutRecoilFlag: BattleContext = {
        ...battleContext,
        hasRecoil: undefined,
      };
      const result = effect.modifyDamageDealt(pokemon, 100, contextWithoutRecoilFlag);
      expect(result).toBeUndefined();
    });

    it('should return undefined when battleContext is not provided', () => {
      const result = effect.modifyDamageDealt(pokemon, 100, undefined);
      expect(result).toBeUndefined();
    });
  });
});
