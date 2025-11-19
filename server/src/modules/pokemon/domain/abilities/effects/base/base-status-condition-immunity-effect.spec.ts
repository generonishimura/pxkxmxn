import { BaseStatusConditionImmunityEffect } from './base-status-condition-immunity-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattleContext } from '../../battle-context.interface';
import { BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

/**
 * テスト用の具象クラス（ねむり無効化）
 */
class TestSleepImmunityEffect extends BaseStatusConditionImmunityEffect {
  protected readonly immuneStatusConditions = [StatusCondition.Sleep] as const;
}

/**
 * テスト用の具象クラス（ねむり・まひ無効化）
 */
class TestMultipleImmunityEffect extends BaseStatusConditionImmunityEffect {
  protected readonly immuneStatusConditions = [
    StatusCondition.Sleep,
    StatusCondition.Paralysis,
  ] as const;
}

describe('BaseStatusConditionImmunityEffect', () => {
  let pokemon: BattlePokemonStatus;
  let battleContext: BattleContext;

  beforeEach(() => {
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
    it('should return false for immune status condition', () => {
      const effect = new TestSleepImmunityEffect();
      const result = effect.canReceiveStatusCondition(pokemon, StatusCondition.Sleep, battleContext);
      expect(result).toBe(false);
    });

    it('should return true for non-immune status condition', () => {
      const effect = new TestSleepImmunityEffect();
      const result = effect.canReceiveStatusCondition(pokemon, StatusCondition.Burn, battleContext);
      expect(result).toBe(true);
    });

    it('should return false for multiple immune status conditions', () => {
      const effect = new TestMultipleImmunityEffect();
      expect(effect.canReceiveStatusCondition(pokemon, StatusCondition.Sleep, battleContext)).toBe(false);
      expect(effect.canReceiveStatusCondition(pokemon, StatusCondition.Paralysis, battleContext)).toBe(false);
    });

    it('should return true for non-immune status condition with multiple immunities', () => {
      const effect = new TestMultipleImmunityEffect();
      const result = effect.canReceiveStatusCondition(pokemon, StatusCondition.Burn, battleContext);
      expect(result).toBe(true);
    });
  });
});

