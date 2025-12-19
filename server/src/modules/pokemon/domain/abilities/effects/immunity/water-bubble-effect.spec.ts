import { WaterBubbleEffect } from './water-bubble-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattleContext } from '../../battle-context.interface';
import { BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('WaterBubbleEffect', () => {
  let effect: WaterBubbleEffect;
  let pokemon: BattlePokemonStatus;
  let battleContext: BattleContext;

  beforeEach(() => {
    effect = new WaterBubbleEffect();
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
    it('should return false for Burn status condition', () => {
      const result = effect.canReceiveStatusCondition(pokemon, StatusCondition.Burn, battleContext);
      expect(result).toBe(false);
    });

    it('should return true for other status conditions', () => {
      expect(effect.canReceiveStatusCondition(pokemon, StatusCondition.Freeze, battleContext)).toBe(true);
      expect(effect.canReceiveStatusCondition(pokemon, StatusCondition.Paralysis, battleContext)).toBe(true);
      expect(effect.canReceiveStatusCondition(pokemon, StatusCondition.Poison, battleContext)).toBe(true);
      expect(effect.canReceiveStatusCondition(pokemon, StatusCondition.BadPoison, battleContext)).toBe(true);
      expect(effect.canReceiveStatusCondition(pokemon, StatusCondition.Sleep, battleContext)).toBe(true);
      expect(effect.canReceiveStatusCondition(pokemon, StatusCondition.Flinch, battleContext)).toBe(true);
    });
  });

  describe('modifyDamage', () => {
    it('should halve damage from Fire-type moves', () => {
      const contextWithFireType: BattleContext = {
        ...battleContext,
        moveTypeName: 'ほのお',
      };
      const damage = 100;
      const result = effect.modifyDamage(pokemon, damage, contextWithFireType);
      expect(result).toBe(50);
    });

    it('should not modify damage from non-Fire-type moves', () => {
      const contextWithWaterType: BattleContext = {
        ...battleContext,
        moveTypeName: 'みず',
      };
      const damage = 100;
      const result = effect.modifyDamage(pokemon, damage, contextWithWaterType);
      expect(result).toBe(100);
    });

    it('should not modify damage when moveTypeName is not provided', () => {
      const damage = 100;
      const result = effect.modifyDamage(pokemon, damage, battleContext);
      expect(result).toBe(100);
    });

    it('should floor the damage result', () => {
      const contextWithFireType: BattleContext = {
        ...battleContext,
        moveTypeName: 'ほのお',
      };
      const damage = 99;
      const result = effect.modifyDamage(pokemon, damage, contextWithFireType);
      expect(result).toBe(49); // Math.floor(99 * 0.5) = 49
    });
  });
});
