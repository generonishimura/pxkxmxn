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

    // 旧テスト群は 100 試行で 10-34 件のヒットを期待する統計テストで、二項分布の
    // 揺らぎで flake する設計だった（PR #230 と同パターン）。`Math.random` を
    // 決定的にモックして確率分岐を直接検証する形に置き換える。
    describe('確率分岐（Math.random 決定モック）', () => {
      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('1 つ目の効果（ひるみ）の確率を通過したらそれが適用される', async () => {
        const effect = new FireFangEffect();
        const attacker = createBattlePokemonStatus();
        const defender = createBattlePokemonStatus();
        const battleContext = createBattleContext();
        // 1つ目のロールで成功
        jest.spyOn(Math, 'random').mockReturnValue(0.05);

        const result = await effect.onHit(attacker, defender, battleContext);

        expect(result).toBe('flinched!');
      });

      it('1 つ目を外し 2 つ目（やけど）が通れば 2 つ目が適用される', async () => {
        const effect = new FireFangEffect();
        const attacker = createBattlePokemonStatus();
        const defender = createBattlePokemonStatus();
        const battleContext = createBattleContext();
        // 1回目: 0.2 で外す（>= 0.1）、2回目: 0.05 で通す
        const rand = jest.spyOn(Math, 'random');
        rand.mockReturnValueOnce(0.2).mockReturnValueOnce(0.05);

        const result = await effect.onHit(attacker, defender, battleContext);

        expect(result).toBe('was burned!');
      });

      it('両方とも確率を外すと何も付与されない', async () => {
        const effect = new FireFangEffect();
        const attacker = createBattlePokemonStatus();
        const defender = createBattlePokemonStatus();
        const battleContext = createBattleContext();
        jest.spyOn(Math, 'random').mockReturnValue(0.5);

        const result = await effect.onHit(attacker, defender, battleContext);

        expect(result).toBeNull();
      });

      it('こおりのキバ: 2 つ目を通すとこおりが付与される', async () => {
        const effect = new IceFangEffect();
        const attacker = createBattlePokemonStatus();
        const defender = createBattlePokemonStatus();
        const battleContext = createBattleContext();
        const rand = jest.spyOn(Math, 'random');
        rand.mockReturnValueOnce(0.5).mockReturnValueOnce(0.05);

        const result = await effect.onHit(attacker, defender, battleContext);

        expect(result).toBe('was frozen solid!');
      });

      it('かみなりのキバ: 2 つ目を通すとまひが付与される', async () => {
        const effect = new ThunderFangEffect();
        const attacker = createBattlePokemonStatus();
        const defender = createBattlePokemonStatus();
        const battleContext = createBattleContext();
        const rand = jest.spyOn(Math, 'random');
        rand.mockReturnValueOnce(0.5).mockReturnValueOnce(0.05);

        const result = await effect.onHit(attacker, defender, battleContext);

        expect(result).toMatch(/paralyzed/);
      });
    });
  });
});

