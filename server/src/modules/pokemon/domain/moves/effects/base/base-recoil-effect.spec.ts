import { BaseRecoilEffect } from './base-recoil-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../../abilities/battle-context.interface';
import { Weather, BattleStatus, Battle } from '@/modules/battle/domain/entities/battle.entity';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';

/**
 * テスト用の具象クラス（反動率0.33、与えたダメージの1/3）
 */
class TestRecoilEffect extends BaseRecoilEffect {
  protected readonly recoilRatio = 0.33;
  protected readonly message = '反動で{damage}ダメージを受けた';
}

/**
 * テスト用の具象クラス（反動率0.0、反動ダメージなし）
 */
class TestNoRecoilEffect extends BaseRecoilEffect {
  protected readonly recoilRatio = 0.0;
  protected readonly message = '反動ダメージなし';
}

/**
 * テスト用の具象クラス（反動率1.0、与えたダメージと同量）
 */
class TestFullRecoilEffect extends BaseRecoilEffect {
  protected readonly recoilRatio = 1.0;
  protected readonly message = '反動で{damage}ダメージを受けた';
}

describe('BaseRecoilEffect', () => {
  let attacker: BattlePokemonStatus;
  let defender: BattlePokemonStatus;
  let battleContext: BattleContext;
  let mockBattleRepository: jest.Mocked<IBattleRepository>;

  beforeEach(() => {
    attacker = {
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

    defender = {
      id: 2,
      battleId: 1,
      trainedPokemonId: 2,
      trainerId: 2,
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

    mockBattleRepository = {
      findBattlePokemonStatusById: jest.fn().mockResolvedValue({
        ...attacker,
        currentHp: 100,
      }),
      updateBattlePokemonStatus: jest.fn().mockResolvedValue(attacker),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findBattlePokemonStatusByBattleId: jest.fn(),
      createBattlePokemonStatus: jest.fn(),
      findActivePokemonByBattleIdAndTrainerId: jest.fn(),
      findBattlePokemonMovesByBattlePokemonStatusId: jest.fn(),
      createBattlePokemonMove: jest.fn(),
      updateBattlePokemonMove: jest.fn(),
      findBattlePokemonMoveById: jest.fn(),
    } as jest.Mocked<IBattleRepository>;

    battleContext = {
      battle: new Battle(1, 1, 2, 1, 2, 1, Weather.None, null, BattleStatus.Active, null),
      battleRepository: mockBattleRepository,
    };
  });

  describe('afterDamage', () => {
    it('should apply recoil damage based on damage dealt', async () => {
      const effect = new TestRecoilEffect();
      const damage = 90; // 与えたダメージ
      const expectedRecoilDamage = Math.floor(damage * 0.33); // 90 * 0.33 = 29.7 -> 29

      const result = await effect.afterDamage(attacker, defender, damage, battleContext);

      expect(mockBattleRepository.findBattlePokemonStatusById).toHaveBeenCalledWith(1);
      expect(mockBattleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
        currentHp: 100 - expectedRecoilDamage, // 100 - 29 = 71
      });
      expect(result).toBe(`反動で${expectedRecoilDamage}ダメージを受けた`);
    });

    it('should not apply recoil damage when damage is 0', async () => {
      const effect = new TestRecoilEffect();
      const damage = 0;

      const result = await effect.afterDamage(attacker, defender, damage, battleContext);

      expect(mockBattleRepository.findBattlePokemonStatusById).not.toHaveBeenCalled();
      expect(mockBattleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should not apply recoil damage when damage is negative', async () => {
      const effect = new TestRecoilEffect();
      const damage = -10;

      const result = await effect.afterDamage(attacker, defender, damage, battleContext);

      expect(mockBattleRepository.findBattlePokemonStatusById).not.toHaveBeenCalled();
      expect(mockBattleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should not apply recoil damage when recoil ratio is 0', async () => {
      const effect = new TestNoRecoilEffect();
      const damage = 100;

      const result = await effect.afterDamage(attacker, defender, damage, battleContext);

      // 反動ダメージが0になるため、findBattlePokemonStatusByIdも呼ばれない
      expect(mockBattleRepository.findBattlePokemonStatusById).not.toHaveBeenCalled();
      expect(mockBattleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should apply full recoil damage when recoil ratio is 1.0', async () => {
      const effect = new TestFullRecoilEffect();
      const damage = 50;

      const result = await effect.afterDamage(attacker, defender, damage, battleContext);

      expect(mockBattleRepository.findBattlePokemonStatusById).toHaveBeenCalledWith(1);
      expect(mockBattleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
        currentHp: 100 - 50, // 100 - 50 = 50
      });
      expect(result).toBe('反動で50ダメージを受けた');
    });

    it('should cap HP at 0 when recoil damage exceeds current HP', async () => {
      const effect = new TestRecoilEffect();
      const damage = 300; // 与えたダメージ
      const expectedRecoilDamage = Math.floor(damage * 0.33); // 300 * 0.33 = 99
      const attackerWithLowHp = {
        ...attacker,
        currentHp: 50,
        maxHp: 100,
      } as BattlePokemonStatus;
      mockBattleRepository.findBattlePokemonStatusById.mockResolvedValue(attackerWithLowHp);

      const result = await effect.afterDamage(attackerWithLowHp, defender, damage, battleContext);

      expect(mockBattleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
        currentHp: 0, // 50 - 99 = -49 -> capped at 0
      });
      expect(result).toBe(`反動で${expectedRecoilDamage}ダメージを受けた`);
    });

    it('should not apply recoil damage when battleRepository is undefined', async () => {
      const effect = new TestRecoilEffect();
      const damage = 100;
      const contextWithoutRepository: BattleContext = {
        ...battleContext,
        battleRepository: undefined,
      };

      const result = await effect.afterDamage(attacker, defender, damage, contextWithoutRepository);

      expect(mockBattleRepository.findBattlePokemonStatusById).not.toHaveBeenCalled();
      expect(mockBattleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should not apply recoil damage when currentStatus is not found', async () => {
      const effect = new TestRecoilEffect();
      const damage = 100;
      mockBattleRepository.findBattlePokemonStatusById.mockResolvedValue(null);

      const result = await effect.afterDamage(attacker, defender, damage, battleContext);

      expect(mockBattleRepository.findBattlePokemonStatusById).toHaveBeenCalledWith(1);
      expect(mockBattleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should floor the recoil damage', async () => {
      const effect = new TestRecoilEffect();
      const damage = 10; // 10 * 0.33 = 3.3 -> 3
      const expectedRecoilDamage = Math.floor(damage * 0.33); // 3

      const result = await effect.afterDamage(attacker, defender, damage, battleContext);

      expect(mockBattleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
        currentHp: 100 - expectedRecoilDamage, // 100 - 3 = 97
      });
      expect(result).toBe(`反動で${expectedRecoilDamage}ダメージを受けた`);
    });

    it('should handle message without {damage} placeholder', async () => {
      class TestRecoilEffectWithoutPlaceholder extends BaseRecoilEffect {
        protected readonly recoilRatio = 0.5;
        protected readonly message = '反動ダメージを受けた';
      }

      const effect = new TestRecoilEffectWithoutPlaceholder();
      const damage = 100;
      const expectedRecoilDamage = Math.floor(damage * 0.5); // 50

      const result = await effect.afterDamage(attacker, defender, damage, battleContext);

      expect(mockBattleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
        currentHp: 100 - expectedRecoilDamage, // 100 - 50 = 50
      });
      expect(result).toBe(`反動ダメージを受けた (${expectedRecoilDamage} damage)`);
    });

    it('should not apply recoil damage when calculated recoil damage is 0', async () => {
      const effect = new TestRecoilEffect();
      const damage = 1; // 1 * 0.33 = 0.33 -> floor(0.33) = 0

      const result = await effect.afterDamage(attacker, defender, damage, battleContext);

      // 反動ダメージが0になるため、findBattlePokemonStatusByIdも呼ばれない
      expect(mockBattleRepository.findBattlePokemonStatusById).not.toHaveBeenCalled();
      expect(mockBattleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });
});

