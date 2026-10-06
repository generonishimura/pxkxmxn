import { DecorateEffect } from './decorate-effect';
import { MoveRegistry } from '../move-registry';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { Weather, BattleStatus, Battle } from '@/modules/battle/domain/entities/battle.entity';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';

const createStatus = (
  id: number,
  ranks: { attackRank: number; specialAttackRank: number },
): BattlePokemonStatus =>
  new BattlePokemonStatus(
    id,
    1,
    id,
    id,
    true,
    100,
    100,
    ranks.attackRank,
    0,
    ranks.specialAttackRank,
    0,
    0,
    0,
    0,
    null,
  );

describe('DecorateEffect', () => {
  let attacker: BattlePokemonStatus;
  let battleContext: BattleContext;
  let mockBattleRepository: jest.Mocked<IBattleRepository>;

  beforeEach(() => {
    attacker = createStatus(1, { attackRank: 0, specialAttackRank: 0 });

    mockBattleRepository = {
      updateBattlePokemonStatus: jest.fn(),
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
    it('相手の攻撃と特攻のランクがそれぞれ 2 段階上がる', async () => {
      // Arrange
      const defender = createStatus(2, { attackRank: 0, specialAttackRank: 0 });
      const effect = new DecorateEffect();

      // Act
      const result = await effect.onUse(attacker, defender, battleContext);

      // Assert
      expect(mockBattleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(2, {
        attackRank: 2,
        specialAttackRank: 2,
      });
      expect(result).toBe('Attack rose! Special Attack rose!');
    });

    it('上昇後のランクは +6 で止まる', async () => {
      // Arrange
      const defender = createStatus(2, { attackRank: 5, specialAttackRank: 6 });
      const effect = new DecorateEffect();

      // Act
      const result = await effect.onUse(attacker, defender, battleContext);

      // Assert
      expect(mockBattleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(2, {
        attackRank: 6,
      });
      expect(result).toBe('Attack rose!');
    });

    it('攻撃と特攻がどちらも +6 のときは何もせず null を返す', async () => {
      // Arrange
      const defender = createStatus(2, { attackRank: 6, specialAttackRank: 6 });
      const effect = new DecorateEffect();

      // Act
      const result = await effect.onUse(attacker, defender, battleContext);

      // Assert
      expect(mockBattleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('登録', () => {
    it('「デコレーション」は DecorateEffect として登録されている', () => {
      // Arrange
      MoveRegistry.clear();
      MoveRegistry.initialize();

      // Act
      const effect = MoveRegistry.get('デコレーション');

      // Assert
      expect(effect).toBeInstanceOf(DecorateEffect);
    });
  });
});
