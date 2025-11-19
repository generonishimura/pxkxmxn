import { BaseTypeAbsorbAndBoostEffect } from './base-type-absorb-and-boost-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Weather, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

/**
 * テスト用の具象クラス（ほのおタイプ無効化、ほのおタイプの技の威力1.5倍）
 */
class TestFireAbsorbAndBoostEffect extends BaseTypeAbsorbAndBoostEffect {
  protected readonly immuneTypes = ['ほのお'] as const;
  protected readonly damageMultiplier = 1.5;
}

describe('BaseTypeAbsorbAndBoostEffect', () => {
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
    it('should return true for immune type', () => {
      const effect = new TestFireAbsorbAndBoostEffect();
      const result = effect.isImmuneToType(pokemon, 'ほのお', battleContext);
      expect(result).toBe(true);
    });

    it('should return false for non-immune type', () => {
      const effect = new TestFireAbsorbAndBoostEffect();
      const result = effect.isImmuneToType(pokemon, 'みず', battleContext);
      expect(result).toBe(false);
    });
  });

  describe('modifyDamageDealt', () => {
    it('should return boosted damage for immune type', () => {
      const effect = new TestFireAbsorbAndBoostEffect();
      const result = effect.modifyDamageDealt(pokemon, 100, battleContext);
      expect(result).toBe(150); // 100 * 1.5 = 150
    });

    it('should return undefined for non-immune type', () => {
      const effect = new TestFireAbsorbAndBoostEffect();
      const contextWithWater: BattleContext = {
        ...battleContext,
        moveTypeName: 'みず',
      };
      const result = effect.modifyDamageDealt(pokemon, 100, contextWithWater);
      expect(result).toBeUndefined();
    });

    it('should return undefined when moveTypeName is undefined', () => {
      const effect = new TestFireAbsorbAndBoostEffect();
      const contextWithoutType: BattleContext = {
        ...battleContext,
        moveTypeName: undefined,
      };
      const result = effect.modifyDamageDealt(pokemon, 100, contextWithoutType);
      expect(result).toBeUndefined();
    });

    it('should return undefined when battleContext is undefined', () => {
      const effect = new TestFireAbsorbAndBoostEffect();
      const result = effect.modifyDamageDealt(pokemon, 100, undefined);
      expect(result).toBeUndefined();
    });

    it('should floor the result', () => {
      const effect = new TestFireAbsorbAndBoostEffect();
      const result = effect.modifyDamageDealt(pokemon, 99, battleContext);
      expect(result).toBe(148); // 99 * 1.5 = 148.5 -> 148
    });
  });
});

