import { FluffyEffect } from './fluffy-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Weather, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('FluffyEffect', () => {
  let effect: FluffyEffect;
  let pokemon: BattlePokemonStatus;
  let battleContext: BattleContext;

  beforeEach(() => {
    effect = new FluffyEffect();
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
      moveTypeName: 'ノーマル',
      moveCategory: 'Physical',
    };
  });

  describe('modifyDamage', () => {
    it('should return 0.5x damage for contact moves', () => {
      const result = effect.modifyDamage(pokemon, 100, battleContext);
      expect(result).toBe(50); // 100 * 0.5 = 50
    });

    it('should return 2x damage for Fire type moves', () => {
      const contextWithFire: BattleContext = {
        ...battleContext,
        moveTypeName: 'ほのお',
      };
      const result = effect.modifyDamage(pokemon, 100, contextWithFire);
      expect(result).toBe(200); // 100 * 2.0 = 200
    });

    it('should return 2x damage for Fire type contact moves (Fire takes priority)', () => {
      const contextWithFireContact: BattleContext = {
        ...battleContext,
        moveTypeName: 'ほのお',
        moveCategory: 'Physical',
      };
      const result = effect.modifyDamage(pokemon, 100, contextWithFireContact);
      expect(result).toBe(200); // ほのおタイプが優先される
    });

    it('should return unchanged damage for non-contact Special moves', () => {
      const contextWithSpecial: BattleContext = {
        ...battleContext,
        moveCategory: 'Special',
      };
      const result = effect.modifyDamage(pokemon, 100, contextWithSpecial);
      expect(result).toBe(100);
    });

    it('should return unchanged damage for Status moves', () => {
      const contextWithStatus: BattleContext = {
        ...battleContext,
        moveCategory: 'Status',
      };
      const result = effect.modifyDamage(pokemon, 100, contextWithStatus);
      expect(result).toBe(100);
    });

    it('should return unchanged damage when battleContext is not provided', () => {
      const result = effect.modifyDamage(pokemon, 100, undefined);
      expect(result).toBe(100);
    });

    it('should return unchanged damage when moveCategory is not provided', () => {
      const contextWithoutCategory: BattleContext = {
        ...battleContext,
        moveCategory: undefined,
      };
      const result = effect.modifyDamage(pokemon, 100, contextWithoutCategory);
      expect(result).toBe(100);
    });
  });
});
