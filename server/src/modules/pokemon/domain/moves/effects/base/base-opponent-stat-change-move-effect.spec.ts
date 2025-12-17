import { BaseOpponentStatChangeMoveEffect } from './base-opponent-stat-change-move-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../../abilities/battle-context.interface';
import { Weather, BattleStatus, Battle } from '@/modules/battle/domain/entities/battle.entity';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';

/**
 * テスト用の具象クラス（相手の攻撃ランク-1）
 */
class TestAttackLowerEffect extends BaseOpponentStatChangeMoveEffect {
  protected readonly statType = 'attack' as const;
  protected readonly rankChange = -1;
}

describe('BaseOpponentStatChangeMoveEffect', () => {
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
      getStatRank: jest.fn((statType: string) => {
        if (statType === 'attack') return defender.attackRank;
        return 0;
      }),
    } as unknown as BattlePokemonStatus;

    mockBattleRepository = {
      updateBattlePokemonStatus: jest.fn().mockResolvedValue(defender),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findBattlePokemonStatusByBattleId: jest.fn(),
      createBattlePokemonStatus: jest.fn(),
      findActivePokemonByBattleIdAndTrainerId: jest.fn(),
      findBattlePokemonStatusById: jest.fn(),
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

  describe('onUse', () => {
    it('should decrease opponent attack rank by 1', async () => {
      const effect = new TestAttackLowerEffect();
      const result = await effect.onUse(attacker, defender, battleContext);

      expect(mockBattleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(2, {
        attackRank: -1,
      });
      expect(result).toBe('Attack fell!');
    });

    it('should not change rank when already at minimum', async () => {
      const defenderWithMinRank = {
        ...defender,
        attackRank: -6,
      } as BattlePokemonStatus;
      (defenderWithMinRank.getStatRank as jest.Mock).mockReturnValue(-6);
      const effect = new TestAttackLowerEffect();
      const result = await effect.onUse(attacker, defenderWithMinRank, battleContext);

      expect(mockBattleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should return null when battleRepository is undefined', async () => {
      const effect = new TestAttackLowerEffect();
      const contextWithoutRepository: BattleContext = {
        ...battleContext,
        battleRepository: undefined,
      };
      const result = await effect.onUse(attacker, defender, contextWithoutRepository);

      expect(mockBattleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });
});

