import { LevitateEffect } from './levitate-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('LevitateEffect', () => {
  let effect: LevitateEffect;
  let pokemon: BattlePokemonStatus;
  let battleContext: BattleContext;

  beforeEach(() => {
    effect = new LevitateEffect();
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
        weather: null,
        field: null,
        status: BattleStatus.Active,
        winnerTrainerId: null,
      },
    };
  });

  describe('isImmuneToType', () => {
    it('should return true for Ground type', () => {
      const result = effect.isImmuneToType(pokemon, 'じめん', battleContext);
      expect(result).toBe(true);
    });

    it('should return false for other types', () => {
      expect(effect.isImmuneToType(pokemon, 'ほのお', battleContext)).toBe(false);
      expect(effect.isImmuneToType(pokemon, 'みず', battleContext)).toBe(false);
      expect(effect.isImmuneToType(pokemon, 'でんき', battleContext)).toBe(false);
      expect(effect.isImmuneToType(pokemon, 'くさ', battleContext)).toBe(false);
      expect(effect.isImmuneToType(pokemon, 'こおり', battleContext)).toBe(false);
    });
  });
});

