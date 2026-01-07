import { SniperEffect } from './sniper-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Weather, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('SniperEffect', () => {
  let effect: SniperEffect;
  let pokemon: BattlePokemonStatus;
  let battleContext: BattleContext;

  beforeEach(() => {
    effect = new SniperEffect();
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
      isCriticalHit: true,
    };
  });

  describe('modifyDamageDealt', () => {
    it('should return 1.5x damage for critical hits', () => {
      // 急所時のダメージ（既に1.5倍が適用されている）に対して、さらに1.5倍を適用
      const criticalDamage = 150; // 通常ダメージ100に対して急所倍率1.5倍が適用済み
      const result = effect.modifyDamageDealt(pokemon, criticalDamage, battleContext);
      expect(result).toBe(225); // 150 * 1.5 = 225（合計2.25倍）
    });

    it('should return undefined for non-critical hits', () => {
      const contextWithoutCritical: BattleContext = {
        ...battleContext,
        isCriticalHit: false,
      };
      const result = effect.modifyDamageDealt(pokemon, 100, contextWithoutCritical);
      expect(result).toBeUndefined();
    });

    it('should return undefined when isCriticalHit is not provided', () => {
      const contextWithoutCriticalFlag: BattleContext = {
        ...battleContext,
        isCriticalHit: undefined,
      };
      const result = effect.modifyDamageDealt(pokemon, 100, contextWithoutCriticalFlag);
      expect(result).toBeUndefined();
    });

    it('should return undefined when battleContext is not provided', () => {
      const result = effect.modifyDamageDealt(pokemon, 100, undefined);
      expect(result).toBeUndefined();
    });
  });
});
