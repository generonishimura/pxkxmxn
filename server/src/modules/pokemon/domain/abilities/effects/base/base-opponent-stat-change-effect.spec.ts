import { BaseOpponentStatChangeEffect } from './base-opponent-stat-change-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';

/**
 * テスト用の具象クラス（防御ランクを+1する）
 */
class TestDefenseStatChangeEffect extends BaseOpponentStatChangeEffect {
  protected readonly statType = 'defense' as const;
  protected readonly rankChange = 1;
}

/**
 * テスト用の具象クラス（特攻ランクを-2する）
 */
class TestSpecialAttackStatChangeEffect extends BaseOpponentStatChangeEffect {
  protected readonly statType = 'specialAttack' as const;
  protected readonly rankChange = -2;
}

describe('BaseOpponentStatChangeEffect', () => {
  // テスト用のヘルパー関数
  const createBattlePokemonStatus = (
    overrides?: Partial<BattlePokemonStatus>,
  ): BattlePokemonStatus => {
    return new BattlePokemonStatus(
      overrides?.id ?? 1,
      overrides?.battleId ?? 1,
      overrides?.trainedPokemonId ?? 1,
      overrides?.trainerId ?? 1,
      overrides?.isActive ?? true,
      overrides?.currentHp ?? 100,
      overrides?.maxHp ?? 100,
      overrides?.attackRank ?? 0,
      overrides?.defenseRank ?? 0,
      overrides?.specialAttackRank ?? 0,
      overrides?.specialDefenseRank ?? 0,
      overrides?.speedRank ?? 0,
      overrides?.accuracyRank ?? 0,
      overrides?.evasionRank ?? 0,
      overrides?.statusCondition ?? null,
    );
  };

  const createBattle = (overrides?: Partial<Battle>): Battle => {
    return new Battle(
      overrides?.id ?? 1,
      overrides?.trainer1Id ?? 1,
      overrides?.trainer2Id ?? 2,
      overrides?.team1Id ?? 1,
      overrides?.team2Id ?? 2,
      overrides?.turn ?? 1,
      overrides?.weather ?? null,
      overrides?.field ?? null,
      overrides?.status ?? BattleStatus.Active,
      overrides?.winnerTrainerId ?? null,
    );
  };

  const createMockBattleRepository = (): jest.Mocked<IBattleRepository> => {
    return {
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findBattlePokemonStatusByBattleId: jest.fn(),
      createBattlePokemonStatus: jest.fn(),
      updateBattlePokemonStatus: jest.fn(),
      findActivePokemonByBattleIdAndTrainerId: jest.fn(),
      findBattlePokemonStatusById: jest.fn(),
      findBattlePokemonMovesByBattlePokemonStatusId: jest.fn(),
      createBattlePokemonMove: jest.fn(),
      updateBattlePokemonMove: jest.fn(),
      findBattlePokemonMoveById: jest.fn(),
    };
  };

  describe('onEntry', () => {
    it('battleContextがない場合、何も実行しない', async () => {
      const effect = new TestDefenseStatChangeEffect();
      const pokemon = createBattlePokemonStatus();

      await effect.onEntry(pokemon, undefined);

      // エラーが発生しないことを確認
      expect(true).toBe(true);
    });

    it('battleRepositoryがない場合、何も実行しない', async () => {
      const effect = new TestDefenseStatChangeEffect();
      const pokemon = createBattlePokemonStatus();
      const battleContext: BattleContext = {
        battle: createBattle(),
      };

      await effect.onEntry(pokemon, battleContext);

      // エラーが発生しないことを確認
      expect(true).toBe(true);
    });

    it('相手のポケモンが見つからない場合、何も実行しない', async () => {
      const effect = new TestDefenseStatChangeEffect();
      const pokemon = createBattlePokemonStatus({ trainerId: 1 });
      const battleRepository = createMockBattleRepository();
      battleRepository.findActivePokemonByBattleIdAndTrainerId.mockResolvedValue(null);
      const battleContext: BattleContext = {
        battle: createBattle({ trainer1Id: 1, trainer2Id: 2 }),
        battleRepository,
      };

      await effect.onEntry(pokemon, battleContext);

      expect(battleRepository.findActivePokemonByBattleIdAndTrainerId).toHaveBeenCalledWith(
        1,
        2,
      );
      expect(battleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('正常に相手の防御ランクを1段階上げる', async () => {
      const effect = new TestDefenseStatChangeEffect();
      const pokemon = createBattlePokemonStatus({ trainerId: 1 });
      const opponentPokemon = createBattlePokemonStatus({
        id: 2,
        trainerId: 2,
        defenseRank: 0,
      });
      const battleRepository = createMockBattleRepository();
      battleRepository.findActivePokemonByBattleIdAndTrainerId.mockResolvedValue(opponentPokemon);
      battleRepository.updateBattlePokemonStatus.mockResolvedValue(
        createBattlePokemonStatus({ id: 2, defenseRank: 1 }),
      );
      const battleContext: BattleContext = {
        battle: createBattle({ trainer1Id: 1, trainer2Id: 2 }),
        battleRepository,
      };

      await effect.onEntry(pokemon, battleContext);

      expect(battleRepository.findActivePokemonByBattleIdAndTrainerId).toHaveBeenCalledWith(
        1,
        2,
      );
      expect(battleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(2, {
        defenseRank: 1,
      });
    });

    it('正常に相手の特攻ランクを2段階下げる', async () => {
      const effect = new TestSpecialAttackStatChangeEffect();
      const pokemon = createBattlePokemonStatus({ trainerId: 1 });
      const opponentPokemon = createBattlePokemonStatus({
        id: 2,
        trainerId: 2,
        specialAttackRank: 2,
      });
      const battleRepository = createMockBattleRepository();
      battleRepository.findActivePokemonByBattleIdAndTrainerId.mockResolvedValue(opponentPokemon);
      battleRepository.updateBattlePokemonStatus.mockResolvedValue(
        createBattlePokemonStatus({ id: 2, specialAttackRank: 0 }),
      );
      const battleContext: BattleContext = {
        battle: createBattle({ trainer1Id: 1, trainer2Id: 2 }),
        battleRepository,
      };

      await effect.onEntry(pokemon, battleContext);

      expect(battleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(2, {
        specialAttackRank: 0,
      });
    });

    it('ランクが+6の場合、+6のまま（上限チェック）', async () => {
      const effect = new TestDefenseStatChangeEffect();
      const pokemon = createBattlePokemonStatus({ trainerId: 1 });
      const opponentPokemon = createBattlePokemonStatus({
        id: 2,
        trainerId: 2,
        defenseRank: 6,
      });
      const battleRepository = createMockBattleRepository();
      battleRepository.findActivePokemonByBattleIdAndTrainerId.mockResolvedValue(opponentPokemon);
      battleRepository.updateBattlePokemonStatus.mockResolvedValue(opponentPokemon);
      const battleContext: BattleContext = {
        battle: createBattle({ trainer1Id: 1, trainer2Id: 2 }),
        battleRepository,
      };

      await effect.onEntry(pokemon, battleContext);

      expect(battleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(2, {
        defenseRank: 6,
      });
    });

    it('ランクが-6の場合、-6のまま（下限チェック）', async () => {
      const effect = new TestSpecialAttackStatChangeEffect();
      const pokemon = createBattlePokemonStatus({ trainerId: 1 });
      const opponentPokemon = createBattlePokemonStatus({
        id: 2,
        trainerId: 2,
        specialAttackRank: -6,
      });
      const battleRepository = createMockBattleRepository();
      battleRepository.findActivePokemonByBattleIdAndTrainerId.mockResolvedValue(opponentPokemon);
      battleRepository.updateBattlePokemonStatus.mockResolvedValue(opponentPokemon);
      const battleContext: BattleContext = {
        battle: createBattle({ trainer1Id: 1, trainer2Id: 2 }),
        battleRepository,
      };

      await effect.onEntry(pokemon, battleContext);

      expect(battleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(2, {
        specialAttackRank: -6,
      }); // -6 + (-2) = -8 → Math.max(-6, -8) = -6
    });

    it('trainer1Idのポケモンが場に出た場合、trainer2Idのポケモンのランクを変更', async () => {
      const effect = new TestDefenseStatChangeEffect();
      const pokemon = createBattlePokemonStatus({ trainerId: 1 });
      const opponentPokemon = createBattlePokemonStatus({
        id: 2,
        trainerId: 2,
        defenseRank: 0,
      });
      const battleRepository = createMockBattleRepository();
      battleRepository.findActivePokemonByBattleIdAndTrainerId.mockResolvedValue(opponentPokemon);
      battleRepository.updateBattlePokemonStatus.mockResolvedValue(opponentPokemon);
      const battleContext: BattleContext = {
        battle: createBattle({ trainer1Id: 1, trainer2Id: 2 }),
        battleRepository,
      };

      await effect.onEntry(pokemon, battleContext);

      expect(battleRepository.findActivePokemonByBattleIdAndTrainerId).toHaveBeenCalledWith(
        1,
        2,
      );
    });

    it('trainer2Idのポケモンが場に出た場合、trainer1Idのポケモンのランクを変更', async () => {
      const effect = new TestDefenseStatChangeEffect();
      const pokemon = createBattlePokemonStatus({ trainerId: 2 });
      const opponentPokemon = createBattlePokemonStatus({
        id: 1,
        trainerId: 1,
        defenseRank: 0,
      });
      const battleRepository = createMockBattleRepository();
      battleRepository.findActivePokemonByBattleIdAndTrainerId.mockResolvedValue(opponentPokemon);
      battleRepository.updateBattlePokemonStatus.mockResolvedValue(opponentPokemon);
      const battleContext: BattleContext = {
        battle: createBattle({ trainer1Id: 1, trainer2Id: 2 }),
        battleRepository,
      };

      await effect.onEntry(pokemon, battleContext);

      expect(battleRepository.findActivePokemonByBattleIdAndTrainerId).toHaveBeenCalledWith(
        1,
        1,
      );
    });
  });
});

