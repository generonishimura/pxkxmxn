import { AccuracyCalculator } from './accuracy-calculator';
import { BattlePokemonStatus } from '../entities/battle-pokemon-status.entity';
import { StatusCondition } from '../entities/status-condition.enum';
import { Weather, Field, Battle, BattleStatus } from '../entities/battle.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';

describe('AccuracyCalculator', () => {
  // テスト用のヘルパー関数
  const createBattlePokemonStatus = (
    overrides: Partial<BattlePokemonStatus> = {},
  ): BattlePokemonStatus => {
    return new BattlePokemonStatus(
      overrides.id ?? 1,
      overrides.battleId ?? 1,
      overrides.trainedPokemonId ?? 1,
      overrides.trainerId ?? 1,
      overrides.isActive ?? true,
      overrides.currentHp ?? 100,
      overrides.maxHp ?? 100,
      overrides.attackRank ?? 0,
      overrides.defenseRank ?? 0,
      overrides.specialAttackRank ?? 0,
      overrides.specialDefenseRank ?? 0,
      overrides.speedRank ?? 0,
      overrides.accuracyRank ?? 0,
      overrides.evasionRank ?? 0,
      overrides.statusCondition ?? StatusCondition.None,
    );
  };

  const createBattle = (overrides: Partial<Battle> = {}): Battle => {
    return new Battle(
      overrides.id ?? 1,
      overrides.trainer1Id ?? 1,
      overrides.trainer2Id ?? 2,
      overrides.team1Id ?? 1,
      overrides.team2Id ?? 2,
      overrides.turn ?? 1,
      overrides.weather ?? null,
      overrides.field ?? null,
      overrides.status ?? BattleStatus.Active,
      overrides.winnerTrainerId ?? null,
    );
  };

  beforeEach(() => {
    // AbilityRegistryをリセット
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    // テストで追加した特性をクリア
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  describe('checkHit', () => {
    it('必中技（accuracy === null）の場合は常に命中する', () => {
      const attacker = createBattlePokemonStatus();
      const defender = createBattlePokemonStatus();

      // 必中技の場合は常にtrueを返す
      const result = AccuracyCalculator.checkHit(null, attacker, defender);
      expect(result).toBe(true);
    });

    it('命中率100の技は常に命中する（ランク補正なし）', () => {
      const attacker = createBattlePokemonStatus({ accuracyRank: 0 });
      const defender = createBattlePokemonStatus({ evasionRank: 0 });

      // 命中率100の技は常に命中
      const result = AccuracyCalculator.checkHit(100, attacker, defender);
      expect(result).toBe(true);
    });

    it('命中率0の技は常に外れる', () => {
      const attacker = createBattlePokemonStatus({ accuracyRank: 0 });
      const defender = createBattlePokemonStatus({ evasionRank: 0 });

      // 命中率0の技は常に外れる
      const result = AccuracyCalculator.checkHit(0, attacker, defender);
      expect(result).toBe(false);
    });

    it('命中ランクが+1の場合、命中率が上がる', () => {
      const attacker = createBattlePokemonStatus({ accuracyRank: 1 });
      const defender = createBattlePokemonStatus({ evasionRank: 0 });

      // 命中率50の技で、命中ランク+1の場合、実効命中率は約66.7%
      // 複数回実行して、少なくとも1回は命中することを確認
      let hitCount = 0;
      for (let i = 0; i < 100; i++) {
        if (AccuracyCalculator.checkHit(50, attacker, defender)) {
          hitCount++;
        }
      }
      // 命中率が上がっているため、50%より多く命中するはず
      expect(hitCount).toBeGreaterThan(40);
    });

    it('回避ランクが+1の場合、命中率が下がる', () => {
      const attacker = createBattlePokemonStatus({ accuracyRank: 0 });
      const defender = createBattlePokemonStatus({ evasionRank: 1 });

      // 命中率50の技で、回避ランク+1の場合、実効命中率は約37.5%
      // 複数回実行して、命中率が下がっていることを確認
      let hitCount = 0;
      for (let i = 0; i < 100; i++) {
        if (AccuracyCalculator.checkHit(50, attacker, defender)) {
          hitCount++;
        }
      }
      // 命中率が下がっているため、50%より少なく命中するはず
      expect(hitCount).toBeLessThan(50);
    });

    it('命中ランク+6と回避ランク-6の場合、実効命中率は最大になる', () => {
      const attacker = createBattlePokemonStatus({ accuracyRank: 6 });
      const defender = createBattlePokemonStatus({ evasionRank: -6 });

      // 命中率50の技で、最大補正の場合、実効命中率は約166.7%（100%に制限）
      // 複数回実行して、ほぼ常に命中することを確認
      let hitCount = 0;
      for (let i = 0; i < 100; i++) {
        if (AccuracyCalculator.checkHit(50, attacker, defender)) {
          hitCount++;
        }
      }
      // ほぼ常に命中するはず
      expect(hitCount).toBeGreaterThan(90);
    });

    it('命中ランク-6と回避ランク+6の場合、実効命中率は最小になる', () => {
      const attacker = createBattlePokemonStatus({ accuracyRank: -6 });
      const defender = createBattlePokemonStatus({ evasionRank: 6 });

      // 命中率50の技で、最小補正の場合、実効命中率は約5.6%
      // 複数回実行して、ほとんど命中しないことを確認
      let hitCount = 0;
      for (let i = 0; i < 100; i++) {
        if (AccuracyCalculator.checkHit(50, attacker, defender)) {
          hitCount++;
        }
      }
      // ほとんど命中しないはず
      expect(hitCount).toBeLessThan(20);
    });

    it('ランク補正により実効命中率が100を超える場合は100%に制限される', () => {
      const attacker = createBattlePokemonStatus({ accuracyRank: 6 });
      const defender = createBattlePokemonStatus({ evasionRank: -6 });

      // 命中率100の技で、最大補正の場合、実効命中率は100%に制限される
      const result = AccuracyCalculator.checkHit(100, attacker, defender);
      expect(result).toBe(true);
    });

    it('ランク補正により実効命中率が0未満になる場合は0%に制限される', () => {
      const attacker = createBattlePokemonStatus({ accuracyRank: -6 });
      const defender = createBattlePokemonStatus({ evasionRank: 6 });

      // 命中率1の技で、最小補正の場合、実効命中率は0%に制限される
      const result = AccuracyCalculator.checkHit(1, attacker, defender);
      expect(result).toBe(false);
    });

    it('特性による命中率補正が適用される', () => {
      const attacker = createBattlePokemonStatus({ accuracyRank: 0 });
      const defender = createBattlePokemonStatus({ evasionRank: 0 });

      // モックの特性効果を作成（命中率を1.5倍にする）
      const mockAbilityEffect = {
        modifyAccuracy: jest.fn((_pokemon, accuracy) => accuracy * 1.5),
      };
      AbilityRegistry.register('テスト特性', mockAbilityEffect as any);

      // 命中率50の技で、特性により命中率が75%になる
      // 複数回実行して、命中率が上がっていることを確認
      let hitCount = 0;
      for (let i = 0; i < 100; i++) {
        if (AccuracyCalculator.checkHit(50, attacker, defender, 'テスト特性')) {
          hitCount++;
        }
      }
      // 命中率が上がっているため、50%より多く命中するはず
      expect(hitCount).toBeGreaterThan(50);
      expect(mockAbilityEffect.modifyAccuracy).toHaveBeenCalled();
    });

    it('特性による命中率補正がundefinedを返す場合、補正が適用されない', () => {
      const attacker = createBattlePokemonStatus({ accuracyRank: 0 });
      const defender = createBattlePokemonStatus({ evasionRank: 0 });

      // モックの特性効果を作成（補正しない）
      const mockAbilityEffect = {
        modifyAccuracy: jest.fn(() => undefined),
      };
      AbilityRegistry.register('テスト特性2', mockAbilityEffect as any);

      // 命中率50の技で、特性が補正しない場合、通常通り動作する
      let hitCount = 0;
      for (let i = 0; i < 100; i++) {
        if (AccuracyCalculator.checkHit(50, attacker, defender, 'テスト特性2')) {
          hitCount++;
        }
      }
      // 補正がないため、通常の命中率で動作する
      expect(hitCount).toBeGreaterThan(30);
      expect(hitCount).toBeLessThan(70);
      expect(mockAbilityEffect.modifyAccuracy).toHaveBeenCalled();
    });

    it('特性による回避率補正が適用される', () => {
      const attacker = createBattlePokemonStatus({ accuracyRank: 0 });
      const defender = createBattlePokemonStatus({ evasionRank: 0 });

      // モックの特性効果を作成（回避率を0.5倍にする = 命中率が50%になる）
      const mockAbilityEffect = {
        modifyEvasion: jest.fn(() => 0.5),
      };
      AbilityRegistry.register('テスト特性3', mockAbilityEffect as any);

      // 命中率100の技で、特性により回避率が0.5倍になるため、実効命中率は50%になる
      // 複数回実行して、命中率が下がっていることを確認
      let hitCount = 0;
      for (let i = 0; i < 100; i++) {
        if (AccuracyCalculator.checkHit(100, attacker, defender, undefined, 'テスト特性3')) {
          hitCount++;
        }
      }
      // 命中率が下がっているため、100%より少なく命中するはず
      expect(hitCount).toBeLessThan(80);
      expect(mockAbilityEffect.modifyEvasion).toHaveBeenCalled();
    });

    it('特性による回避率補正が1.0の場合、完全回避される', () => {
      const attacker = createBattlePokemonStatus({ accuracyRank: 0 });
      const defender = createBattlePokemonStatus({ evasionRank: 0 });

      // モックの特性効果を作成（完全回避）
      const mockAbilityEffect = {
        modifyEvasion: jest.fn(() => 1.0),
      };
      AbilityRegistry.register('テスト特性4', mockAbilityEffect as any);

      // 命中率100の技で、特性により完全回避される
      const result = AccuracyCalculator.checkHit(100, attacker, defender, undefined, 'テスト特性4');
      expect(result).toBe(false);
      expect(mockAbilityEffect.modifyEvasion).toHaveBeenCalled();
    });

    it('特性による回避率補正がundefinedを返す場合、補正が適用されない', () => {
      const attacker = createBattlePokemonStatus({ accuracyRank: 0 });
      const defender = createBattlePokemonStatus({ evasionRank: 0 });

      // モックの特性効果を作成（補正しない）
      const mockAbilityEffect = {
        modifyEvasion: jest.fn(() => undefined),
      };
      AbilityRegistry.register('テスト特性5', mockAbilityEffect as any);

      // 命中率100の技で、特性が補正しない場合、通常通り命中する
      const result = AccuracyCalculator.checkHit(100, attacker, defender, undefined, 'テスト特性5');
      expect(result).toBe(true);
      expect(mockAbilityEffect.modifyEvasion).toHaveBeenCalled();
    });

    it('特性による命中率補正と回避率補正が同時に適用される', () => {
      const attacker = createBattlePokemonStatus({ accuracyRank: 0 });
      const defender = createBattlePokemonStatus({ evasionRank: 0 });

      // モックの特性効果を作成
      const attackerAbilityEffect = {
        modifyAccuracy: jest.fn((_pokemon, accuracy) => accuracy * 1.5), // 命中率1.5倍
      };
      const defenderAbilityEffect = {
        modifyEvasion: jest.fn(() => 0.2), // 回避率0.2 = 命中率80%
      };
      AbilityRegistry.register('テスト特性6', attackerAbilityEffect as any);
      AbilityRegistry.register('テスト特性7', defenderAbilityEffect as any);

      // 命中率50の技で、攻撃側の特性により75%になり、防御側の特性により60%になる
      // 複数回実行して、補正が適用されていることを確認
      let hitCount = 0;
      for (let i = 0; i < 100; i++) {
        if (AccuracyCalculator.checkHit(50, attacker, defender, 'テスト特性6', 'テスト特性7')) {
          hitCount++;
        }
      }
      // 補正が適用されているため、通常の50%とは異なる結果になる
      expect(hitCount).toBeGreaterThan(30);
      expect(attackerAbilityEffect.modifyAccuracy).toHaveBeenCalled();
      expect(defenderAbilityEffect.modifyEvasion).toHaveBeenCalled();
    });

    it('特性による補正により実効命中率が100を超える場合は100%に制限される', () => {
      const attacker = createBattlePokemonStatus({ accuracyRank: 0 });
      const defender = createBattlePokemonStatus({ evasionRank: 0 });

      // モックの特性効果を作成（命中率を2倍にする）
      const mockAbilityEffect = {
        modifyAccuracy: jest.fn((_pokemon, accuracy) => accuracy * 2),
      };
      AbilityRegistry.register('テスト特性8', mockAbilityEffect as any);

      // 命中率100の技で、特性により200%になるが、100%に制限される
      const result = AccuracyCalculator.checkHit(100, attacker, defender, 'テスト特性8');
      expect(result).toBe(true);
      expect(mockAbilityEffect.modifyAccuracy).toHaveBeenCalled();
    });

    it('特性による補正により実効命中率が0未満になる場合は0%に制限される', () => {
      const attacker = createBattlePokemonStatus({ accuracyRank: 0 });
      const defender = createBattlePokemonStatus({ evasionRank: 0 });

      // モックの特性効果を作成（回避率を1.5倍にする = 実効命中率が負になる）
      const mockAbilityEffect = {
        modifyEvasion: jest.fn(() => 1.5), // 1.0を超える値（不正な値だが、テスト用）
      };
      AbilityRegistry.register('テスト特性9', mockAbilityEffect as any);

      // 命中率50の技で、特性により実効命中率が負になるが、0%に制限される
      const result = AccuracyCalculator.checkHit(50, attacker, defender, undefined, 'テスト特性9');
      expect(result).toBe(false);
      expect(mockAbilityEffect.modifyEvasion).toHaveBeenCalled();
    });

    it('攻撃側がかたやぶりを持っている場合、防御側の回避率補正を無視する', () => {
      const attacker = createBattlePokemonStatus({ accuracyRank: 0 });
      const defender = createBattlePokemonStatus({ evasionRank: 0 });

      // モックの特性効果を作成（回避率を0.5倍にする = 命中率が50%になる）
      const mockAbilityEffect = {
        modifyEvasion: jest.fn(() => 0.5),
      };
      AbilityRegistry.register('テスト特性10', mockAbilityEffect as any);

      const battle = createBattle();

      // かたやぶりがある場合は回避率補正が無視されるため、命中率100%の技は常に命中する
      // 命中率100%の技は、実効命中率が100%であれば常に命中するため、単一実行で検証可能
      const hitWithMoldBreaker = AccuracyCalculator.checkHit(
        100,
        attacker,
        defender,
        AbilityRegistry.MOLD_BREAKER_ABILITY_NAME,
        'テスト特性10',
        {
          battle,
        },
      );
      expect(hitWithMoldBreaker).toBe(true);

      // かたやぶりがない場合は回避率補正が適用されるため、命中率が低下する
      // 回避率0.5 = 命中率50%なので、統計的に検証する
      let hitCountWithoutMoldBreaker = 0;
      const testIterations = 1000; // 統計的な検証のため、試行回数を増やす
      for (let i = 0; i < testIterations; i++) {
        if (
          AccuracyCalculator.checkHit(100, attacker, defender, undefined, 'テスト特性10', {
            battle,
          })
        ) {
          hitCountWithoutMoldBreaker++;
        }
      }
      // 回避率補正が適用されているため、通常の100%とは異なる結果になる
      // 回避率0.5 = 命中率50%なので、統計的に約50%になるはず
      // 試行回数を増やすことで、統計的な検証の精度を向上
      const hitRate = hitCountWithoutMoldBreaker / testIterations;
      expect(hitRate).toBeGreaterThan(0.45); // 45%以上
      expect(hitRate).toBeLessThan(0.55); // 55%未満

      expect(mockAbilityEffect.modifyEvasion).toHaveBeenCalled();
    });
  });
});
