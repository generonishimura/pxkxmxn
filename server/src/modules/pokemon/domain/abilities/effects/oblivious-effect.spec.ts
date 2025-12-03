import { ObliviousEffect } from './oblivious-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattleContext } from '../battle-context.interface';
import { BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('ObliviousEffect', () => {
  let effect: ObliviousEffect;
  let pokemon: BattlePokemonStatus;
  let battleContext: BattleContext;

  beforeEach(() => {
    effect = new ObliviousEffect();
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
      statusCondition: StatusCondition.None,
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

  describe('canReceiveStatusCondition', () => {
    it('should return false for Sleep status condition', () => {
      const result = effect.canReceiveStatusCondition(pokemon, StatusCondition.Sleep, battleContext);
      expect(result).toBe(false);
    });

    it('should return true for other status conditions', () => {
      expect(effect.canReceiveStatusCondition(pokemon, StatusCondition.Burn, battleContext)).toBe(true);
      expect(effect.canReceiveStatusCondition(pokemon, StatusCondition.Freeze, battleContext)).toBe(true);
      expect(effect.canReceiveStatusCondition(pokemon, StatusCondition.Paralysis, battleContext)).toBe(true);
      expect(effect.canReceiveStatusCondition(pokemon, StatusCondition.Poison, battleContext)).toBe(true);
      expect(effect.canReceiveStatusCondition(pokemon, StatusCondition.BadPoison, battleContext)).toBe(true);
    });
  });
});

