import { StickyWebEffect } from './sticky-web-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';

describe('StickyWebEffect', () => {
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

  describe('onSwitchOut', () => {
    it('battleContextがない場合、何も実行しない', async () => {
      const effect = new StickyWebEffect();
      const pokemon = createBattlePokemonStatus({ trainerId: 1 });

      await expect(effect.onSwitchOut(pokemon, undefined)).resolves.not.toThrow();
    });

    it('battleRepositoryがない場合、何も実行しない', async () => {
      const effect = new StickyWebEffect();
      const pokemon = createBattlePokemonStatus({ trainerId: 1 });
      const battle = createBattle();
      const battleContext: BattleContext = {
        battle,
        // battleRepository を提供しない
      };

      await expect(effect.onSwitchOut(pokemon, battleContext)).resolves.not.toThrow();
    });

    it('相手のポケモンが見つからない場合、何も実行しない', async () => {
      const effect = new StickyWebEffect();
      const pokemon = createBattlePokemonStatus({ trainerId: 1 });
      const battle = createBattle({ trainer1Id: 1, trainer2Id: 2 });
      const mockRepository = createMockBattleRepository();
      mockRepository.findActivePokemonByBattleIdAndTrainerId.mockResolvedValue(null);

      const battleContext: BattleContext = {
        battle,
        battleRepository: mockRepository,
      };

      await effect.onSwitchOut(pokemon, battleContext);

      expect(mockRepository.findActivePokemonByBattleIdAndTrainerId).toHaveBeenCalledWith(
        battle.id,
        2, // 相手のトレーナーID
      );
      expect(mockRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('正常に相手の素早さランクを1段階下げる', async () => {
      const effect = new StickyWebEffect();
      const pokemon = createBattlePokemonStatus({ trainerId: 1 });
      const opponentPokemon = createBattlePokemonStatus({
        id: 2,
        trainerId: 2,
        speedRank: 0,
      });
      const battle = createBattle({ trainer1Id: 1, trainer2Id: 2 });
      const mockRepository = createMockBattleRepository();
      mockRepository.findActivePokemonByBattleIdAndTrainerId.mockResolvedValue(opponentPokemon);
      mockRepository.updateBattlePokemonStatus.mockResolvedValue(
        createBattlePokemonStatus({ id: 2, speedRank: -1 }),
      );

      const battleContext: BattleContext = {
        battle,
        battleRepository: mockRepository,
      };

      await effect.onSwitchOut(pokemon, battleContext);

      expect(mockRepository.findActivePokemonByBattleIdAndTrainerId).toHaveBeenCalledWith(
        battle.id,
        2,
      );
      expect(mockRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(2, {
        speedRank: -1,
      });
    });

    it('相手の素早さランクが+6の場合、+5になる（上限チェック）', async () => {
      const effect = new StickyWebEffect();
      const pokemon = createBattlePokemonStatus({ trainerId: 1 });
      const opponentPokemon = createBattlePokemonStatus({
        id: 2,
        trainerId: 2,
        speedRank: 6,
      });
      const battle = createBattle({ trainer1Id: 1, trainer2Id: 2 });
      const mockRepository = createMockBattleRepository();
      mockRepository.findActivePokemonByBattleIdAndTrainerId.mockResolvedValue(opponentPokemon);
      mockRepository.updateBattlePokemonStatus.mockResolvedValue(opponentPokemon);

      const battleContext: BattleContext = {
        battle,
        battleRepository: mockRepository,
      };

      await effect.onSwitchOut(pokemon, battleContext);

      expect(mockRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(2, {
        speedRank: 5,
      });
    });

    it('相手の素早さランクが-6の場合、-6のまま（下限チェック）', async () => {
      const effect = new StickyWebEffect();
      const pokemon = createBattlePokemonStatus({ trainerId: 1 });
      const opponentPokemon = createBattlePokemonStatus({
        id: 2,
        trainerId: 2,
        speedRank: -6,
      });
      const battle = createBattle({ trainer1Id: 1, trainer2Id: 2 });
      const mockRepository = createMockBattleRepository();
      mockRepository.findActivePokemonByBattleIdAndTrainerId.mockResolvedValue(opponentPokemon);
      mockRepository.updateBattlePokemonStatus.mockResolvedValue(opponentPokemon);

      const battleContext: BattleContext = {
        battle,
        battleRepository: mockRepository,
      };

      await effect.onSwitchOut(pokemon, battleContext);

      expect(mockRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(2, {
        speedRank: -6,
      }); // -6 + (-1) = -7 → Math.max(-6, -7) = -6
    });

    it('trainer1Idのポケモンが場から下がった場合、trainer2Idのポケモンのランクを変更', async () => {
      const effect = new StickyWebEffect();
      const pokemon = createBattlePokemonStatus({ trainerId: 1 });
      const opponentPokemon = createBattlePokemonStatus({
        id: 2,
        trainerId: 2,
        speedRank: 0,
      });
      const battle = createBattle({ trainer1Id: 1, trainer2Id: 2 });
      const mockRepository = createMockBattleRepository();
      mockRepository.findActivePokemonByBattleIdAndTrainerId.mockResolvedValue(opponentPokemon);
      mockRepository.updateBattlePokemonStatus.mockResolvedValue(opponentPokemon);

      const battleContext: BattleContext = {
        battle,
        battleRepository: mockRepository,
      };

      await effect.onSwitchOut(pokemon, battleContext);

      expect(mockRepository.findActivePokemonByBattleIdAndTrainerId).toHaveBeenCalledWith(
        battle.id,
        2,
      );
    });

    it('trainer2Idのポケモンが場から下がった場合、trainer1Idのポケモンのランクを変更', async () => {
      const effect = new StickyWebEffect();
      const pokemon = createBattlePokemonStatus({ trainerId: 2 });
      const opponentPokemon = createBattlePokemonStatus({
        id: 1,
        trainerId: 1,
        speedRank: 0,
      });
      const battle = createBattle({ trainer1Id: 1, trainer2Id: 2 });
      const mockRepository = createMockBattleRepository();
      mockRepository.findActivePokemonByBattleIdAndTrainerId.mockResolvedValue(opponentPokemon);
      mockRepository.updateBattlePokemonStatus.mockResolvedValue(opponentPokemon);

      const battleContext: BattleContext = {
        battle,
        battleRepository: mockRepository,
      };

      await effect.onSwitchOut(pokemon, battleContext);

      expect(mockRepository.findActivePokemonByBattleIdAndTrainerId).toHaveBeenCalledWith(
        battle.id,
        1,
      );
    });
  });
});

