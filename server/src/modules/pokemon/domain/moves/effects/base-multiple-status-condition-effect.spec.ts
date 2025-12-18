import {
  BaseMultipleStatusConditionEffect,
  StatusConditionConfig,
} from './base-multiple-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { FireFangEffect } from './fire-fang-effect';
import { IceFangEffect } from './ice-fang-effect';
import { ThunderFangEffect } from './thunder-fang-effect';

/**
 * テスト用の具象クラス（複数の状態異常を付与）
 */
class TestMultipleStatusEffect extends BaseMultipleStatusConditionEffect {
  protected readonly statusConditions: readonly StatusConditionConfig[] = [
    {
      statusCondition: StatusCondition.Flinch,
      chance: 1.0, // 100%の確率でテストしやすくする
      immuneTypes: [],
      message: 'flinched!',
    },
    {
      statusCondition: StatusCondition.Burn,
      chance: 1.0, // 100%の確率でテストしやすくする
      immuneTypes: ['ほのお'],
      message: 'was burned!',
    },
  ];
}

describe('BaseMultipleStatusConditionEffect', () => {
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

  const createBattleContext = (): BattleContext => {
    const battle = new Battle(
      1, // id
      1, // trainer1Id
      2, // trainer2Id
      1, // team1Id
      2, // team2Id
      1, // turn
      null, // weather
      null, // field
      BattleStatus.Active, // status
      null, // winnerTrainerId
    );

    const mockBattleRepository = {
      updateBattlePokemonStatus: jest.fn().mockResolvedValue(undefined),
    };

    const mockTrainedPokemonRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 1,
        pokemon: {
          id: 1,
          primaryType: { name: 'ノーマル' },
          secondaryType: null,
        },
        ability: null,
      }),
    };

    return {
      battle,
      battleRepository: mockBattleRepository as any,
      trainedPokemonRepository: mockTrainedPokemonRepository as any,
    };
  };

  describe('onHit', () => {
    it('最初に成功した状態異常を付与する', async () => {
      const effect = new TestMultipleStatusEffect();
      const attacker = createBattlePokemonStatus();
      const defender = createBattlePokemonStatus();
      const battleContext = createBattleContext();

      const result = await effect.onHit(attacker, defender, battleContext);

      // 最初の状態異常（ひるみ）が付与される
      expect(result).toBe('flinched!');
      expect(battleContext.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(
        defender.id,
        { statusCondition: StatusCondition.Flinch },
      );
    });

    it('既に状態異常がある場合は付与しない', async () => {
      const effect = new TestMultipleStatusEffect();
      const attacker = createBattlePokemonStatus();
      const defender = createBattlePokemonStatus({
        statusCondition: StatusCondition.Burn,
      });
      const battleContext = createBattleContext();

      const result = await effect.onHit(attacker, defender, battleContext);

      expect(result).toBeNull();
      expect(battleContext.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('免疫タイプのポケモンには状態異常を付与しない', async () => {
      const effect = new TestMultipleStatusEffect();
      const attacker = createBattlePokemonStatus();
      const defender = createBattlePokemonStatus();
      const battleContext = createBattleContext();

      // ほのおタイプのポケモンに変更
      (battleContext.trainedPokemonRepository?.findById as jest.Mock).mockResolvedValue({
        id: 1,
        pokemon: {
          id: 1,
          primaryType: { name: 'ほのお' },
          secondaryType: null,
        },
        ability: null,
      });

      const result = await effect.onHit(attacker, defender, battleContext);

      // ひるみは免疫タイプがないので付与される
      expect(result).toBe('flinched!');
      expect(battleContext.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(
        defender.id,
        { statusCondition: StatusCondition.Flinch },
      );
    });

    it('確率に基づいて状態異常を付与する', async () => {
      const effect = new FireFangEffect();
      const attacker = createBattlePokemonStatus();
      const defender = createBattlePokemonStatus();
      const battleContext = createBattleContext();

      // 複数回実行して確率的な動作を確認
      const results: (string | null)[] = [];
      for (let i = 0; i < 100; i++) {
        // モックをリセット
        (battleContext.battleRepository?.updateBattlePokemonStatus as jest.Mock).mockClear();
        const result = await effect.onHit(attacker, defender, battleContext);
        results.push(result);
      }

      const successCount = results.filter(r => r !== null).length;
      // 2つの独立した10%の確率で少なくとも1つが成功する確率は約19% (1 - 0.9 × 0.9)
      // そのため、10%以上25%以下になることが期待される
      expect(successCount).toBeGreaterThan(10);
      expect(successCount).toBeLessThan(25);
    });

    it('ほのおのキバは10%の確率でひるみまたはやけどを付与する', async () => {
      const effect = new FireFangEffect();
      const attacker = createBattlePokemonStatus();
      const defender = createBattlePokemonStatus();
      const battleContext = createBattleContext();

      // 複数回実行して確率的な動作を確認
      const results: (string | null)[] = [];
      for (let i = 0; i < 100; i++) {
        // モックをリセット
        (battleContext.battleRepository?.updateBattlePokemonStatus as jest.Mock).mockClear();
        const result = await effect.onHit(attacker, defender, battleContext);
        results.push(result);
      }

      const successCount = results.filter(r => r !== null).length;
      // 2つの独立した10%の確率で少なくとも1つが成功する確率は約19% (1 - 0.9 × 0.9)
      // そのため、10%以上25%以下になることが期待される
      expect(successCount).toBeGreaterThan(10);
      expect(successCount).toBeLessThan(25);

      // 成功した場合、ひるみまたはやけどが付与される
      const successResults = results.filter(r => r !== null);
      successResults.forEach(result => {
        expect(result).toMatch(/flinched!|was burned!/);
      });
    });

    it('こおりのキバは10%の確率でひるみまたはこおりを付与する', async () => {
      const effect = new IceFangEffect();
      const attacker = createBattlePokemonStatus();
      const defender = createBattlePokemonStatus();
      const battleContext = createBattleContext();

      // 複数回実行して確率的な動作を確認
      const results: (string | null)[] = [];
      for (let i = 0; i < 100; i++) {
        // モックをリセット
        (battleContext.battleRepository?.updateBattlePokemonStatus as jest.Mock).mockClear();
        const result = await effect.onHit(attacker, defender, battleContext);
        results.push(result);
      }

      const successCount = results.filter(r => r !== null).length;
      // 2つの独立した10%の確率で少なくとも1つが成功する確率は約19% (1 - 0.9 × 0.9)
      // そのため、10%以上25%以下になることが期待される
      expect(successCount).toBeGreaterThan(10);
      expect(successCount).toBeLessThan(25);

      // 成功した場合、ひるみまたはこおりが付与される
      const successResults = results.filter(r => r !== null);
      successResults.forEach(result => {
        expect(result).toMatch(/flinched!|was frozen solid!/);
      });
    });

    it('かみなりのキバは10%の確率でひるみまたはまひを付与する', async () => {
      const effect = new ThunderFangEffect();
      const attacker = createBattlePokemonStatus();
      const defender = createBattlePokemonStatus();
      const battleContext = createBattleContext();

      // 複数回実行して確率的な動作を確認
      const results: (string | null)[] = [];
      for (let i = 0; i < 100; i++) {
        // モックをリセット
        (battleContext.battleRepository?.updateBattlePokemonStatus as jest.Mock).mockClear();
        const result = await effect.onHit(attacker, defender, battleContext);
        results.push(result);
      }

      const successCount = results.filter(r => r !== null).length;
      // 2つの独立した10%の確率で少なくとも1つが成功する確率は約19% (1 - 0.9 × 0.9)
      // そのため、10%以上25%以下になることが期待される
      expect(successCount).toBeGreaterThan(10);
      expect(successCount).toBeLessThan(25);

      // 成功した場合、ひるみまたはまひが付与される
      const successResults = results.filter(r => r !== null);
      successResults.forEach(result => {
        expect(result).toMatch(/flinched!|is paralyzed! It may be unable to move!/);
      });
    });
  });
});

