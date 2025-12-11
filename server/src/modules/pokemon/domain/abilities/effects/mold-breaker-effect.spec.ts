import { MoldBreakerEffect } from './mold-breaker-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../battle-context.interface';
import { AbilityRegistry } from '../ability-registry';

describe('MoldBreakerEffect', () => {
  let effect: MoldBreakerEffect;
  let pokemon: BattlePokemonStatus;
  let battleContext: BattleContext;

  beforeEach(() => {
    effect = new MoldBreakerEffect();
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
        status: 'Active' as any,
        winnerTrainerId: null,
      },
    };
  });

  beforeEach(() => {
    // AbilityRegistryを初期化（テスト用）
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  describe('基本設定', () => {
    it('インスタンスが作成できること', () => {
      expect(effect).toBeDefined();
    });

    it('AbilityRegistryから正しく取得できること', () => {
      const retrievedEffect = AbilityRegistry.get('かたやぶり');
      expect(retrievedEffect).toBeDefined();
      expect(retrievedEffect).toBeInstanceOf(MoldBreakerEffect);
    });

    it('hasMoldBreakerが正しく動作すること', () => {
      expect(AbilityRegistry.hasMoldBreaker('かたやぶり')).toBe(true);
      expect(AbilityRegistry.hasMoldBreaker('いかく')).toBe(false);
      expect(AbilityRegistry.hasMoldBreaker(undefined)).toBe(false);
    });
  });
});
