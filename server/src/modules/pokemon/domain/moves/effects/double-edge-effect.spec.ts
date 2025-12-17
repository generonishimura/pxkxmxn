import { DoubleEdgeEffect } from './double-edge-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { Move, MoveCategory } from '../../entities/move.entity';
import { Type } from '../../entities/type.entity';
import { Weather, BattleStatus, Battle } from '@/modules/battle/domain/entities/battle.entity';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';
import {
  createBattlePokemonStatus,
  createBattleContext,
  createMove,
} from './__tests__/test-helpers';

describe('DoubleEdgeEffect', () => {
  let effect: DoubleEdgeEffect;
  let attacker: BattlePokemonStatus;
  let defender: BattlePokemonStatus;
  let move: Move;
  let battleContext: BattleContext;
  let mockBattleRepository: jest.Mocked<IBattleRepository>;

  beforeEach(() => {
    effect = new DoubleEdgeEffect();
    attacker = createBattlePokemonStatus({
      id: 1,
      trainedPokemonId: 1,
      trainerId: 1,
      currentHp: 100,
      maxHp: 100,
    });
    defender = createBattlePokemonStatus({
      id: 2,
      trainedPokemonId: 2,
      trainerId: 2,
    });
    move = createMove(
      'すてみタックル',
      'Double-Edge',
      new Type(1, 'ノーマル', 'Normal'),
      MoveCategory.Physical,
      {
        power: 120,
        accuracy: 100,
        pp: 15,
      },
    );

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

    battleContext = createBattleContext({
      battleRepository: mockBattleRepository,
    });
  });

  describe('afterDamage', () => {
    it('与えたダメージの1/3を反動ダメージとして適用する', async () => {
      const damage = 90; // 与えたダメージ
      const expectedRecoilDamage = Math.floor(damage / 3); // 90 / 3 = 30

      const result = await effect.afterDamage(attacker, defender, damage, battleContext);

      expect(mockBattleRepository.findBattlePokemonStatusById).toHaveBeenCalledWith(1);
      expect(mockBattleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
        currentHp: 100 - expectedRecoilDamage, // 100 - 30 = 70
      });
      expect(result).toBe(`反動で${expectedRecoilDamage}ダメージを受けた`);
    });

    it('ダメージが0の場合は反動ダメージを発生させない', async () => {
      const damage = 0;

      const result = await effect.afterDamage(attacker, defender, damage, battleContext);

      expect(mockBattleRepository.findBattlePokemonStatusById).not.toHaveBeenCalled();
      expect(mockBattleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('反動ダメージがHPを0未満にしない', async () => {
      const damage = 300; // 与えたダメージ
      const expectedRecoilDamage = Math.floor(damage / 3); // 300 / 3 = 100
      const attackerWithLowHp = {
        ...attacker,
        currentHp: 50,
        maxHp: 100,
      } as BattlePokemonStatus;
      mockBattleRepository.findBattlePokemonStatusById.mockResolvedValue(attackerWithLowHp);

      const result = await effect.afterDamage(attackerWithLowHp, defender, damage, battleContext);

      expect(mockBattleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
        currentHp: 0, // 50 - 100 = -50 -> capped at 0
      });
      expect(result).toBe(`反動で${expectedRecoilDamage}ダメージを受けた`);
    });

    it('反動ダメージを切り捨てて計算する', async () => {
      const damage = 10; // 10 / 3 = 3.333... -> 3
      const expectedRecoilDamage = Math.floor(damage / 3); // 3

      const result = await effect.afterDamage(attacker, defender, damage, battleContext);

      expect(mockBattleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
        currentHp: 100 - expectedRecoilDamage, // 100 - 3 = 97
      });
      expect(result).toBe(`反動で${expectedRecoilDamage}ダメージを受けた`);
    });
  });
});

