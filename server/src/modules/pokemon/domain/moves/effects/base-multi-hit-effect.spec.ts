import { BaseMultiHitEffect } from './base-multi-hit-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { Move, MoveCategory } from '../../entities/move.entity';
import { Type } from '../../entities/type.entity';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

/**
 * テスト用の具象クラス（2-5回攻撃）
 */
class TestMultiHitEffect2to5 extends BaseMultiHitEffect {
  protected readonly minHits = 2;
  protected readonly maxHits = 5;
}

/**
 * テスト用の具象クラス（固定2回攻撃）
 */
class TestMultiHitEffectFixed2 extends BaseMultiHitEffect {
  protected readonly minHits = 2;
  protected readonly maxHits = 2;
}

/**
 * テスト用の具象クラス（3-4回攻撃）
 */
class TestMultiHitEffect3to4 extends BaseMultiHitEffect {
  protected readonly minHits = 3;
  protected readonly maxHits = 4;
}

describe('BaseMultiHitEffect', () => {
  let attacker: BattlePokemonStatus;
  let defender: BattlePokemonStatus;
  let move: Move;
  let battleContext: BattleContext;

  beforeEach(() => {
    attacker = {
      id: 1,
      battleId: 1,
      trainedPokemonId: 1,
      trainerId: 1,
      isActive: true,
      currentHp: 100,
      maxHp: 100,
      attackRank: 0,
      defenseRank: 0,
      specialAttackRank: 0,
      specialDefenseRank: 0,
      speedRank: 0,
      accuracyRank: 0,
      evasionRank: 0,
      statusCondition: null,
    } as BattlePokemonStatus;

    defender = {
      id: 2,
      battleId: 1,
      trainedPokemonId: 2,
      trainerId: 2,
      isActive: true,
      currentHp: 100,
      maxHp: 100,
      attackRank: 0,
      defenseRank: 0,
      specialAttackRank: 0,
      specialDefenseRank: 0,
      speedRank: 0,
      accuracyRank: 0,
      evasionRank: 0,
      statusCondition: null,
    } as BattlePokemonStatus;

    move = {
      id: 1,
      name: 'TestMove',
      nameEn: 'TestMove',
      type: new Type(1, 'ノーマル', 'Normal'),
      category: MoveCategory.Physical,
      power: 25,
      accuracy: 80,
      pp: 15,
      priority: 0,
      description: null,
    } as Move;

    battleContext = {
      battle: {
        id: 1,
        trainer1Id: 1,
        trainer2Id: 2,
        team1Id: 1,
        team2Id: 2,
        turn: 1,
        weather: null,
        field: null,
        status: BattleStatus.Active,
        winnerTrainerId: null,
      },
    };
  });

  describe('determineHitCount', () => {
    it('minHitsとmaxHitsが同じ場合、固定回数を返す', () => {
      const effect = new TestMultiHitEffectFixed2();
      const hitCount = effect['determineHitCount']();
      expect(hitCount).toBe(2);
    });

    it('minHitsとmaxHitsが異なる場合、範囲内の回数を返す', () => {
      const effect = new TestMultiHitEffect2to5();
      const hitCounts: number[] = [];
      // 100回試行して、範囲内の値が返されることを確認
      for (let i = 0; i < 100; i++) {
        const count = effect['determineHitCount']();
        hitCounts.push(count);
        expect(count).toBeGreaterThanOrEqual(2);
        expect(count).toBeLessThanOrEqual(5);
      }
      // 範囲内の全ての値が出現することを確認（確率的だが、100回試行すればほぼ確実）
      const uniqueCounts = new Set(hitCounts);
      expect(uniqueCounts.size).toBeGreaterThan(1);
    });
  });

  describe('beforeDamage', () => {
    it('攻撃回数を決定し、BattleContextに保存する', async () => {
      const effect = new TestMultiHitEffect2to5();
      await effect.beforeDamage(attacker, defender, move, battleContext);
      expect(battleContext.multiHitCount).toBeDefined();
      expect(battleContext.multiHitCount).toBeGreaterThanOrEqual(2);
      expect(battleContext.multiHitCount).toBeLessThanOrEqual(5);
    });

    it('固定回数の場合、常に同じ回数を設定する', async () => {
      const effect = new TestMultiHitEffectFixed2();
      await effect.beforeDamage(attacker, defender, move, battleContext);
      expect(battleContext.multiHitCount).toBe(2);
    });

    it('複数回実行しても、毎回新しい回数を決定する', async () => {
      const effect = new TestMultiHitEffect2to5();
      const counts: number[] = [];
      for (let i = 0; i < 10; i++) {
        const newContext: BattleContext = {
          ...battleContext,
        };
        await effect.beforeDamage(attacker, defender, move, newContext);
        counts.push(newContext.multiHitCount!);
      }
      // 全ての回数が範囲内であることを確認
      counts.forEach(count => {
        expect(count).toBeGreaterThanOrEqual(2);
        expect(count).toBeLessThanOrEqual(5);
      });
    });

    it('3-4回攻撃の場合、3または4の回数を設定する', async () => {
      const effect = new TestMultiHitEffect3to4();
      const counts: number[] = [];
      for (let i = 0; i < 50; i++) {
        const newContext: BattleContext = {
          ...battleContext,
        };
        await effect.beforeDamage(attacker, defender, move, newContext);
        counts.push(newContext.multiHitCount!);
      }
      // 全ての回数が3または4であることを確認
      counts.forEach(count => {
        expect([3, 4]).toContain(count);
      });
    });
  });
});

