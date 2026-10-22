import { BaseRuinEffect } from './base-ruin-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

/**
 * テスト用の具象クラス（相手の攻撃を下げる = 物理ダメージを受けにくくする）
 */
class TestOffenseRuinEffect extends BaseRuinEffect {
  protected readonly loweredStat = 'offense' as const;
  protected readonly moveCategory = 'Physical' as const;
}

/**
 * テスト用の具象クラス（相手の特防を下げる = 特殊ダメージを与えやすくする）
 */
class TestDefenseRuinEffect extends BaseRuinEffect {
  protected readonly loweredStat = 'defense' as const;
  protected readonly moveCategory = 'Special' as const;
}

describe('BaseRuinEffect', () => {
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const createCtx = (cat?: 'Physical' | 'Special' | 'Status'): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    moveCategory: cat,
  });

  describe('相手の攻撃系ステータスを下げる特性', () => {
    const effect = new TestOffenseRuinEffect();

    it('対象カテゴリの技で受けるダメージを 0.75 倍にする', () => {
      expect(effect.modifyDamage(pokemon, 100, createCtx('Physical'))).toBe(75);
    });

    it('対象外カテゴリの技で受けるダメージは変えない', () => {
      expect(effect.modifyDamage(pokemon, 100, createCtx('Special'))).toBe(100);
    });

    it('battleContext が無い場合は受けるダメージを変えない', () => {
      expect(effect.modifyDamage(pokemon, 100, undefined)).toBe(100);
    });

    it('小数になる値は Math.floor で切り捨てる', () => {
      expect(effect.modifyDamage(pokemon, 101, createCtx('Physical'))).toBe(75);
    });

    it('与えるダメージは変えない', () => {
      expect(effect.modifyDamageDealt(pokemon, 100, createCtx('Physical'))).toBeUndefined();
    });
  });

  describe('相手の防御系ステータスを下げる特性', () => {
    const effect = new TestDefenseRuinEffect();

    it('対象カテゴリの技で与えるダメージを 1/0.75 倍にする', () => {
      expect(effect.modifyDamageDealt(pokemon, 100, createCtx('Special'))).toBe(133);
    });

    it('対象外カテゴリの技で与えるダメージは変えない', () => {
      expect(effect.modifyDamageDealt(pokemon, 100, createCtx('Physical'))).toBeUndefined();
    });

    it('battleContext が無い場合は与えるダメージを変えない', () => {
      expect(effect.modifyDamageDealt(pokemon, 100, undefined)).toBeUndefined();
    });

    it('受けるダメージは変えない', () => {
      expect(effect.modifyDamage(pokemon, 100, createCtx('Special'))).toBe(100);
    });
  });
});
