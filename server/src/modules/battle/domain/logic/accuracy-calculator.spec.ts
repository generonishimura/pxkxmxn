import { AccuracyCalculator } from './accuracy-calculator';
import { BattlePokemonStatus } from '../entities/battle-pokemon-status.entity';
import { StatusCondition } from '../entities/status-condition.enum';
import { Weather, Field, Battle, BattleStatus } from '../entities/battle.entity';

describe('AccuracyCalculator', () => {
  // テスト用のヘルパー関数
  const createBattlePokemonStatus = (overrides: Partial<BattlePokemonStatus> = {}): BattlePokemonStatus => {
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
  });
});

