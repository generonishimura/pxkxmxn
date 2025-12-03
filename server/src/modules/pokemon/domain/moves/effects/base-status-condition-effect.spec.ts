import { BaseStatusConditionEffect } from './base-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { AirSlashEffect } from './air-slash-effect';
import { FireFangEffect } from './fire-fang-effect';

/**
 * テスト用の具象クラス（やけどを付与）
 */
class TestBurnEffect extends BaseStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Burn;
  protected readonly chance = 1.0; // 100%の確率でテストしやすくする
  protected readonly immuneTypes = ['ほのお'];
  protected readonly message = 'was burned!';
}

/**
 * テスト用の具象クラス（ひるみを付与）
 */
class TestFlinchEffect extends BaseStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Flinch;
  protected readonly chance = 1.0; // 100%の確率でテストしやすくする
  protected readonly immuneTypes: string[] = []; // ひるみには免疫タイプがない
  protected readonly message = 'flinched!';
}

describe('BaseStatusConditionEffect', () => {
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
    it('確率に基づいて状態異常を付与する', async () => {
      const effect = new TestBurnEffect();
      const attacker = createBattlePokemonStatus();
      const defender = createBattlePokemonStatus();
      const battleContext = createBattleContext();

      const result = await effect.onHit(attacker, defender, battleContext);

      expect(result).toBe('was burned!');
      expect(battleContext.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(
        defender.id,
        { statusCondition: StatusCondition.Burn },
      );
    });

    it('既に状態異常がある場合は付与しない', async () => {
      const effect = new TestBurnEffect();
      const attacker = createBattlePokemonStatus();
      const defender = createBattlePokemonStatus({ statusCondition: StatusCondition.Poison });
      const battleContext = createBattleContext();

      const result = await effect.onHit(attacker, defender, battleContext);

      expect(result).toBeNull();
      expect(battleContext.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('免疫タイプのポケモンには状態異常を付与しない', async () => {
      const effect = new TestBurnEffect();
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

      expect(result).toBeNull();
      expect(battleContext.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('ひるみを付与する技のテスト', async () => {
      const effect = new AirSlashEffect();
      const attacker = createBattlePokemonStatus();
      const defender = createBattlePokemonStatus();
      const battleContext = createBattleContext();

      // 確率を100%にするために、chanceを1.0に設定したテスト用クラスを使用
      const testEffect = new TestFlinchEffect();
      const result = await testEffect.onHit(attacker, defender, battleContext);

      expect(result).toBe('flinched!');
      expect(battleContext.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(
        defender.id,
        { statusCondition: StatusCondition.Flinch },
      );
    });

    it('エアスラッシュは30%の確率でひるみを付与する', async () => {
      const effect = new AirSlashEffect();
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
      // 30%の確率なので、20%以上40%以下になることが期待される
      expect(successCount).toBeGreaterThan(20);
      expect(successCount).toBeLessThan(40);
    });

    it('ほのおのキバは10%の確率でひるみを付与する', async () => {
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
      // 10%の確率なので、5%以上15%以下になることが期待される
      expect(successCount).toBeGreaterThan(5);
      expect(successCount).toBeLessThan(15);
    });
  });
});

