import { BaseTypeImmunityEffect } from './base-type-immunity-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

/**
 * テスト用の具象クラス（じめんタイプ無効化）
 */
class TestGroundImmunityEffect extends BaseTypeImmunityEffect {
  protected readonly immuneTypes = ['じめん'] as const;
}

/**
 * テスト用の具象クラス（じめん・でんきタイプ無効化）
 */
class TestMultipleTypeImmunityEffect extends BaseTypeImmunityEffect {
  protected readonly immuneTypes = ['じめん', 'でんき'] as const;
}

describe('BaseTypeImmunityEffect', () => {
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
        weather: null,
        field: null,
        status: BattleStatus.Active,
        winnerTrainerId: null,
      },
    };
  });

  describe('isImmuneToType', () => {
    it('should return true for immune type', () => {
      const effect = new TestGroundImmunityEffect();
      const result = effect.isImmuneToType(pokemon, 'じめん', battleContext);
      expect(result).toBe(true);
    });

    it('should return false for non-immune type', () => {
      const effect = new TestGroundImmunityEffect();
      const result = effect.isImmuneToType(pokemon, 'ほのお', battleContext);
      expect(result).toBe(false);
    });

    it('should return true for multiple immune types', () => {
      const effect = new TestMultipleTypeImmunityEffect();
      expect(effect.isImmuneToType(pokemon, 'じめん', battleContext)).toBe(true);
      expect(effect.isImmuneToType(pokemon, 'でんき', battleContext)).toBe(true);
    });

    it('should return false for non-immune type with multiple immunities', () => {
      const effect = new TestMultipleTypeImmunityEffect();
      const result = effect.isImmuneToType(pokemon, 'ほのお', battleContext);
      expect(result).toBe(false);
    });
  });
});

