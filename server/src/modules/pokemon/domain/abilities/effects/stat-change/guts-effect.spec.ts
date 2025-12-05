import { GutsEffect } from './guts-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';

describe('GutsEffect', () => {
  let effect: GutsEffect;
  let battleContext: BattleContext;

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

  beforeEach(() => {
    effect = new GutsEffect();
  });

  describe('onEntry', () => {
    it('battleContextがない場合、何も実行しない', async () => {
      const pokemon = createBattlePokemonStatus({
        statusCondition: StatusCondition.Burn,
      });

      await effect.onEntry(pokemon, undefined);

      // エラーが発生しないことを確認
      expect(true).toBe(true);
    });

    it('battleRepositoryがない場合、何も実行しない', async () => {
      const pokemon = createBattlePokemonStatus({
        statusCondition: StatusCondition.Burn,
      });
      const battleContext: BattleContext = {
        battle: createBattle(),
      };

      await effect.onEntry(pokemon, battleContext);

      // エラーが発生しないことを確認
      expect(true).toBe(true);
    });

    it('状態異常がある場合（やけど）、攻撃ランクが+1される', async () => {
      const pokemon = createBattlePokemonStatus({
        id: 1,
        attackRank: 0,
        statusCondition: StatusCondition.Burn,
      });
      const battleRepository = createMockBattleRepository();
      battleRepository.updateBattlePokemonStatus.mockResolvedValue(
        createBattlePokemonStatus({ id: 1, attackRank: 1, statusCondition: StatusCondition.Burn }),
      );
      const battleContext: BattleContext = {
        battle: createBattle(),
        battleRepository,
      };

      await effect.onEntry(pokemon, battleContext);

      expect(battleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
        attackRank: 1,
      });
    });

    it('状態異常がある場合（どく）、攻撃ランクが+1される', async () => {
      const pokemon = createBattlePokemonStatus({
        id: 1,
        attackRank: 0,
        statusCondition: StatusCondition.Poison,
      });
      const battleRepository = createMockBattleRepository();
      battleRepository.updateBattlePokemonStatus.mockResolvedValue(
        createBattlePokemonStatus({ id: 1, attackRank: 1, statusCondition: StatusCondition.Poison }),
      );
      const battleContext: BattleContext = {
        battle: createBattle(),
        battleRepository,
      };

      await effect.onEntry(pokemon, battleContext);

      expect(battleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
        attackRank: 1,
      });
    });

    it('状態異常がある場合（まひ）、攻撃ランクが+1される', async () => {
      const pokemon = createBattlePokemonStatus({
        id: 1,
        attackRank: 0,
        statusCondition: StatusCondition.Paralysis,
      });
      const battleRepository = createMockBattleRepository();
      battleRepository.updateBattlePokemonStatus.mockResolvedValue(
        createBattlePokemonStatus({ id: 1, attackRank: 1, statusCondition: StatusCondition.Paralysis }),
      );
      const battleContext: BattleContext = {
        battle: createBattle(),
        battleRepository,
      };

      await effect.onEntry(pokemon, battleContext);

      expect(battleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
        attackRank: 1,
      });
    });

    it('状態異常がNoneの場合、攻撃ランクが変更されない', async () => {
      const pokemon = createBattlePokemonStatus({
        id: 1,
        attackRank: 0,
        statusCondition: StatusCondition.None,
      });
      const battleRepository = createMockBattleRepository();
      const battleContext: BattleContext = {
        battle: createBattle(),
        battleRepository,
      };

      await effect.onEntry(pokemon, battleContext);

      expect(battleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('状態異常がnullの場合、攻撃ランクが変更されない', async () => {
      const pokemon = createBattlePokemonStatus({
        id: 1,
        attackRank: 0,
        statusCondition: null,
      });
      const battleRepository = createMockBattleRepository();
      const battleContext: BattleContext = {
        battle: createBattle(),
        battleRepository,
      };

      await effect.onEntry(pokemon, battleContext);

      expect(battleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('ランクが+6の場合、+6のまま（上限チェック）', async () => {
      const pokemon = createBattlePokemonStatus({
        id: 1,
        attackRank: 6,
        statusCondition: StatusCondition.Burn,
      });
      const battleRepository = createMockBattleRepository();
      battleRepository.updateBattlePokemonStatus.mockResolvedValue(
        createBattlePokemonStatus({ id: 1, attackRank: 6, statusCondition: StatusCondition.Burn }),
      );
      const battleContext: BattleContext = {
        battle: createBattle(),
        battleRepository,
      };

      await effect.onEntry(pokemon, battleContext);

      expect(battleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
        attackRank: 6,
      });
    });
  });
});
