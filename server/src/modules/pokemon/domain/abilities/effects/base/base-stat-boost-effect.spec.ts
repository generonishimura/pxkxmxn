import { BaseStatBoostEffect } from './base-stat-boost-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';

/**
 * テスト用の具象クラス（攻撃ランクを+1する）
 */
class TestAttackStatBoostEffect extends BaseStatBoostEffect {
  protected readonly statType = 'attack' as const;
  protected readonly rankChange = 1;
}

/**
 * テスト用の具象クラス（特攻ランクを+2する）
 */
class TestSpecialAttackStatBoostEffect extends BaseStatBoostEffect {
  protected readonly statType = 'specialAttack' as const;
  protected readonly rankChange = 2;
}

/**
 * テスト用の具象クラス（防御ランクを-1する）
 */
class TestDefenseStatDecreaseEffect extends BaseStatBoostEffect {
  protected readonly statType = 'defense' as const;
  protected readonly rankChange = -1;
}

describe('BaseStatBoostEffect', () => {
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
      const effect = new TestAttackStatBoostEffect();
      const pokemon = createBattlePokemonStatus();

      await effect.onEntry(pokemon, undefined);

      // エラーが発生しないことを確認
      expect(true).toBe(true);
    });

    it('battleRepositoryがない場合、何も実行しない', async () => {
      const effect = new TestAttackStatBoostEffect();
      const pokemon = createBattlePokemonStatus();
      const battleContext: BattleContext = {
        battle: createBattle(),
      };

      await effect.onEntry(pokemon, battleContext);

      // エラーが発生しないことを確認
      expect(true).toBe(true);
    });

    it('正常に自分の攻撃ランクを1段階上げる', async () => {
      const effect = new TestAttackStatBoostEffect();
      const pokemon = createBattlePokemonStatus({
        id: 1,
        attackRank: 0,
      });
      const battleRepository = createMockBattleRepository();
      battleRepository.updateBattlePokemonStatus.mockResolvedValue(
        createBattlePokemonStatus({ id: 1, attackRank: 1 }),
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

    it('正常に自分の特攻ランクを2段階上げる', async () => {
      const effect = new TestSpecialAttackStatBoostEffect();
      const pokemon = createBattlePokemonStatus({
        id: 1,
        specialAttackRank: 0,
      });
      const battleRepository = createMockBattleRepository();
      battleRepository.updateBattlePokemonStatus.mockResolvedValue(
        createBattlePokemonStatus({ id: 1, specialAttackRank: 2 }),
      );
      const battleContext: BattleContext = {
        battle: createBattle(),
        battleRepository,
      };

      await effect.onEntry(pokemon, battleContext);

      expect(battleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
        specialAttackRank: 2,
      });
    });

    it('正常に自分の防御ランクを1段階下げる', async () => {
      const effect = new TestDefenseStatDecreaseEffect();
      const pokemon = createBattlePokemonStatus({
        id: 1,
        defenseRank: 1,
      });
      const battleRepository = createMockBattleRepository();
      battleRepository.updateBattlePokemonStatus.mockResolvedValue(
        createBattlePokemonStatus({ id: 1, defenseRank: 0 }),
      );
      const battleContext: BattleContext = {
        battle: createBattle(),
        battleRepository,
      };

      await effect.onEntry(pokemon, battleContext);

      expect(battleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
        defenseRank: 0,
      });
    });

    it('ランクが+6の場合、+6のまま（上限チェック）', async () => {
      const effect = new TestAttackStatBoostEffect();
      const pokemon = createBattlePokemonStatus({
        id: 1,
        attackRank: 6,
      });
      const battleRepository = createMockBattleRepository();
      battleRepository.updateBattlePokemonStatus.mockResolvedValue(
        createBattlePokemonStatus({ id: 1, attackRank: 6 }),
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

    it('ランクが-6の場合、-6のまま（下限チェック）', async () => {
      const effect = new TestDefenseStatDecreaseEffect();
      const pokemon = createBattlePokemonStatus({
        id: 1,
        defenseRank: -6,
      });
      const battleRepository = createMockBattleRepository();
      battleRepository.updateBattlePokemonStatus.mockResolvedValue(
        createBattlePokemonStatus({ id: 1, defenseRank: -6 }),
      );
      const battleContext: BattleContext = {
        battle: createBattle(),
        battleRepository,
      };

      await effect.onEntry(pokemon, battleContext);

      expect(battleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
        defenseRank: -6,
      }); // -6 + (-1) = -7 → Math.max(-6, -7) = -6
    });

    it('全てのステータスタイプで正常に動作する', async () => {
      const battleRepository = createMockBattleRepository();
      const battleContext: BattleContext = {
        battle: createBattle(),
        battleRepository,
      };

      // 攻撃
      const attackEffect = new TestAttackStatBoostEffect();
      const attackPokemon = createBattlePokemonStatus({ id: 1, attackRank: 0 });
      await attackEffect.onEntry(attackPokemon, battleContext);
      expect(battleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
        attackRank: 1,
      });

      // 防御
      const defenseEffect = new TestDefenseStatDecreaseEffect();
      const defensePokemon = createBattlePokemonStatus({ id: 2, defenseRank: 1 });
      await defenseEffect.onEntry(defensePokemon, battleContext);
      expect(battleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(2, {
        defenseRank: 0,
      });

      // 特攻
      const specialAttackEffect = new TestSpecialAttackStatBoostEffect();
      const specialAttackPokemon = createBattlePokemonStatus({ id: 3, specialAttackRank: 0 });
      await specialAttackEffect.onEntry(specialAttackPokemon, battleContext);
      expect(battleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(3, {
        specialAttackRank: 2,
      });
    });
  });
});

