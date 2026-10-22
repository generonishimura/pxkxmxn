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
    it('与えたダメージの33%を反動ダメージとして適用する', async () => {
      const damage = 90; // 与えたダメージ
      const expectedRecoilDamage = 30; // 90 * 0.33 = 29.7 -> 30

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
      const dealtRecoilDamage = 50; // 300 * 0.33 = 99 だが、残りHPの50だけ減る
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
      expect(result).toBe(`反動で${dealtRecoilDamage}ダメージを受けた`);
    });

    it('反動ダメージを四捨五入して計算する', async () => {
      const damage = 50; // 50 * 0.33 = 16.5 -> 17
      const expectedRecoilDamage = 17;

      const result = await effect.afterDamage(attacker, defender, damage, battleContext);

      expect(mockBattleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
        currentHp: 100 - expectedRecoilDamage, // 100 - 17 = 83
      });
      expect(result).toBe(`反動で${expectedRecoilDamage}ダメージを受けた`);
    });

    it('反動の割合は1/3ではなく33%で計算する（本家と同じ）', async () => {
      const damage = 152; // 152 * 0.33 = 50.16 -> 50（1/3 なら 50.67 -> 51）
      const expectedRecoilDamage = 50;

      const result = await effect.afterDamage(attacker, defender, damage, battleContext);

      expect(mockBattleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
        currentHp: 100 - expectedRecoilDamage, // 100 - 50 = 50
      });
      expect(result).toBe(`反動で${expectedRecoilDamage}ダメージを受けた`);
    });
  });
});
