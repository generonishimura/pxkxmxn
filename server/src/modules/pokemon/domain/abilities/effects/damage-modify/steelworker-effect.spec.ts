import { SteelworkerEffect } from './steelworker-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Weather, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('SteelworkerEffect', () => {
  let effect: SteelworkerEffect;
  let pokemon: BattlePokemonStatus;
  let battleContext: BattleContext;

  beforeEach(() => {
    effect = new SteelworkerEffect();
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
      moveTypeName: 'はがね',
    };
  });

  describe('modifyDamageDealt', () => {
    it('should return 1.5x damage for Steel type', () => {
      const result = effect.modifyDamageDealt(pokemon, 100, battleContext);
      expect(result).toBe(150); // 100 * 1.5 = 150
    });

    it('should return undefined for non-Steel type', () => {
      const contextWithFire: BattleContext = {
        ...battleContext,
        moveTypeName: 'ほのお',
      };
      const result = effect.modifyDamageDealt(pokemon, 100, contextWithFire);
      expect(result).toBeUndefined();
    });
  });
});

