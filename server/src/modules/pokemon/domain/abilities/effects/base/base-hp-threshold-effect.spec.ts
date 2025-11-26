import { BaseHpThresholdEffect } from './base-hp-threshold-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * テスト用の具象クラス（HP満タン時にダメージ半減）
 */
class TestHpFullDamageEffect extends BaseHpThresholdEffect {
  protected readonly thresholdType = 'full' as const;
  protected readonly damageMultiplier = 0.5;

  modifyDamage(
    pokemon: BattlePokemonStatus,
    damage: number,
    _battleContext?: BattleContext,
  ): number {
    if (!this.checkHpThreshold(pokemon)) {
      return damage;
    }
    return Math.floor(damage * this.damageMultiplier);
  }
}

/**
 * テスト用の具象クラス（HP半分以下でダメージ1.5倍）
 */
class TestHpHalfDamageEffect extends BaseHpThresholdEffect {
  protected readonly thresholdType = 'half' as const;
  protected readonly damageMultiplier = 1.5;

  modifyDamage(
    pokemon: BattlePokemonStatus,
    damage: number,
    _battleContext?: BattleContext,
  ): number {
    if (!this.checkHpThreshold(pokemon)) {
      return damage;
    }
    return Math.floor(damage * this.damageMultiplier);
  }
}

/**
 * テスト用の具象クラス（HP1/3以下でダメージ2.0倍）
 */
class TestHpThirdDamageEffect extends BaseHpThresholdEffect {
  protected readonly thresholdType = 'third' as const;
  protected readonly damageMultiplier = 2.0;

  modifyDamage(
    pokemon: BattlePokemonStatus,
    damage: number,
    _battleContext?: BattleContext,
  ): number {
    if (!this.checkHpThreshold(pokemon)) {
      return damage;
    }
    return Math.floor(damage * this.damageMultiplier);
  }
}

/**
 * テスト用の具象クラス（HP1/4以下でダメージ2.0倍）
 */
class TestHpQuarterDamageEffect extends BaseHpThresholdEffect {
  protected readonly thresholdType = 'quarter' as const;
  protected readonly damageMultiplier = 2.0;

  modifyDamage(
    pokemon: BattlePokemonStatus,
    damage: number,
    _battleContext?: BattleContext,
  ): number {
    if (!this.checkHpThreshold(pokemon)) {
      return damage;
    }
    return Math.floor(damage * this.damageMultiplier);
  }
}

/**
 * テスト用の具象クラス（カスタム閾値: 0.2以下でダメージ1.5倍）
 */
class TestCustomHpThresholdDamageEffect extends BaseHpThresholdEffect {
  protected readonly thresholdType = 'custom' as const;
  protected readonly damageMultiplier = 1.5;
  protected customThreshold = 0.2;

  modifyDamage(
    pokemon: BattlePokemonStatus,
    damage: number,
    _battleContext?: BattleContext,
  ): number {
    if (!this.checkHpThreshold(pokemon)) {
      return damage;
    }
    return Math.floor(damage * this.damageMultiplier);
  }
}

describe('BaseHpThresholdEffect', () => {
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

  describe('checkHpThreshold - full', () => {
    it('HPが満タンの場合、trueを返す', () => {
      const effect = new TestHpFullDamageEffect();
      const pokemon = createBattlePokemonStatus({ currentHp: 100, maxHp: 100 });

      const result = effect['checkHpThreshold'](pokemon);

      expect(result).toBe(true);
    });

    it('HPが満タンでない場合、falseを返す', () => {
      const effect = new TestHpFullDamageEffect();
      const pokemon = createBattlePokemonStatus({ currentHp: 99, maxHp: 100 });

      const result = effect['checkHpThreshold'](pokemon);

      expect(result).toBe(false);
    });
  });

  describe('checkHpThreshold - half', () => {
    it('HPが半分以下の場合、trueを返す', () => {
      const effect = new TestHpHalfDamageEffect();
      const pokemon = createBattlePokemonStatus({ currentHp: 50, maxHp: 100 });

      const result = effect['checkHpThreshold'](pokemon);

      expect(result).toBe(true);
    });

    it('HPが半分より多い場合、falseを返す', () => {
      const effect = new TestHpHalfDamageEffect();
      const pokemon = createBattlePokemonStatus({ currentHp: 51, maxHp: 100 });

      const result = effect['checkHpThreshold'](pokemon);

      expect(result).toBe(false);
    });

    it('HPが0の場合、trueを返す', () => {
      const effect = new TestHpHalfDamageEffect();
      const pokemon = createBattlePokemonStatus({ currentHp: 0, maxHp: 100 });

      const result = effect['checkHpThreshold'](pokemon);

      expect(result).toBe(true);
    });
  });

  describe('checkHpThreshold - third', () => {
    it('HPが1/3以下の場合、trueを返す', () => {
      const effect = new TestHpThirdDamageEffect();
      const pokemon = createBattlePokemonStatus({ currentHp: 33, maxHp: 100 });

      const result = effect['checkHpThreshold'](pokemon);

      expect(result).toBe(true);
    });

    it('HPが1/3より多い場合、falseを返す', () => {
      const effect = new TestHpThirdDamageEffect();
      const pokemon = createBattlePokemonStatus({ currentHp: 34, maxHp: 100 });

      const result = effect['checkHpThreshold'](pokemon);

      expect(result).toBe(false);
    });
  });

  describe('checkHpThreshold - quarter', () => {
    it('HPが1/4以下の場合、trueを返す', () => {
      const effect = new TestHpQuarterDamageEffect();
      const pokemon = createBattlePokemonStatus({ currentHp: 25, maxHp: 100 });

      const result = effect['checkHpThreshold'](pokemon);

      expect(result).toBe(true);
    });

    it('HPが1/4より多い場合、falseを返す', () => {
      const effect = new TestHpQuarterDamageEffect();
      const pokemon = createBattlePokemonStatus({ currentHp: 26, maxHp: 100 });

      const result = effect['checkHpThreshold'](pokemon);

      expect(result).toBe(false);
    });
  });

  describe('checkHpThreshold - custom', () => {
    it('HPがカスタム閾値以下の場合、trueを返す', () => {
      const effect = new TestCustomHpThresholdDamageEffect();
      const pokemon = createBattlePokemonStatus({ currentHp: 20, maxHp: 100 });

      const result = effect['checkHpThreshold'](pokemon);

      expect(result).toBe(true);
    });

    it('HPがカスタム閾値より多い場合、falseを返す', () => {
      const effect = new TestCustomHpThresholdDamageEffect();
      const pokemon = createBattlePokemonStatus({ currentHp: 21, maxHp: 100 });

      const result = effect['checkHpThreshold'](pokemon);

      expect(result).toBe(false);
    });
  });

  describe('modifyDamage - HP満タン', () => {
    it('HPが満タンの場合、ダメージが半減する', () => {
      const effect = new TestHpFullDamageEffect();
      const pokemon = createBattlePokemonStatus({ currentHp: 100, maxHp: 100 });

      const result = effect.modifyDamage(pokemon, 100);

      expect(result).toBe(50); // 100 * 0.5 = 50
    });

    it('HPが満タンでない場合、ダメージが変更されない', () => {
      const effect = new TestHpFullDamageEffect();
      const pokemon = createBattlePokemonStatus({ currentHp: 99, maxHp: 100 });

      const result = effect.modifyDamage(pokemon, 100);

      expect(result).toBe(100);
    });
  });

  describe('modifyDamage - HP半分以下', () => {
    it('HPが半分以下の場合、ダメージが1.5倍になる', () => {
      const effect = new TestHpHalfDamageEffect();
      const pokemon = createBattlePokemonStatus({ currentHp: 50, maxHp: 100 });

      const result = effect.modifyDamage(pokemon, 100);

      expect(result).toBe(150); // 100 * 1.5 = 150
    });

    it('HPが半分より多い場合、ダメージが変更されない', () => {
      const effect = new TestHpHalfDamageEffect();
      const pokemon = createBattlePokemonStatus({ currentHp: 51, maxHp: 100 });

      const result = effect.modifyDamage(pokemon, 100);

      expect(result).toBe(100);
    });
  });

  describe('modifyDamage - HP1/3以下', () => {
    it('HPが1/3以下の場合、ダメージが2.0倍になる', () => {
      const effect = new TestHpThirdDamageEffect();
      const pokemon = createBattlePokemonStatus({ currentHp: 33, maxHp: 100 });

      const result = effect.modifyDamage(pokemon, 100);

      expect(result).toBe(200); // 100 * 2.0 = 200
    });

    it('HPが1/3より多い場合、ダメージが変更されない', () => {
      const effect = new TestHpThirdDamageEffect();
      const pokemon = createBattlePokemonStatus({ currentHp: 34, maxHp: 100 });

      const result = effect.modifyDamage(pokemon, 100);

      expect(result).toBe(100);
    });
  });

  describe('modifyDamage - HP1/4以下', () => {
    it('HPが1/4以下の場合、ダメージが2.0倍になる', () => {
      const effect = new TestHpQuarterDamageEffect();
      const pokemon = createBattlePokemonStatus({ currentHp: 25, maxHp: 100 });

      const result = effect.modifyDamage(pokemon, 100);

      expect(result).toBe(200); // 100 * 2.0 = 200
    });

    it('HPが1/4より多い場合、ダメージが変更されない', () => {
      const effect = new TestHpQuarterDamageEffect();
      const pokemon = createBattlePokemonStatus({ currentHp: 26, maxHp: 100 });

      const result = effect.modifyDamage(pokemon, 100);

      expect(result).toBe(100);
    });
  });

  describe('modifyDamage - カスタム閾値', () => {
    it('HPがカスタム閾値以下の場合、ダメージが1.5倍になる', () => {
      const effect = new TestCustomHpThresholdDamageEffect();
      const pokemon = createBattlePokemonStatus({ currentHp: 20, maxHp: 100 });

      const result = effect.modifyDamage(pokemon, 100);

      expect(result).toBe(150); // 100 * 1.5 = 150
    });

    it('HPがカスタム閾値より多い場合、ダメージが変更されない', () => {
      const effect = new TestCustomHpThresholdDamageEffect();
      const pokemon = createBattlePokemonStatus({ currentHp: 21, maxHp: 100 });

      const result = effect.modifyDamage(pokemon, 100);

      expect(result).toBe(100);
    });
  });

  describe('境界値チェック', () => {
    it('HPがちょうど半分の場合、trueを返す', () => {
      const effect = new TestHpHalfDamageEffect();
      const pokemon = createBattlePokemonStatus({ currentHp: 50, maxHp: 100 });

      const result = effect['checkHpThreshold'](pokemon);

      expect(result).toBe(true);
    });

    it('HPがちょうど1/3の場合、trueを返す', () => {
      const effect = new TestHpThirdDamageEffect();
      const pokemon = createBattlePokemonStatus({ currentHp: 33, maxHp: 99 });

      const result = effect['checkHpThreshold'](pokemon);

      expect(result).toBe(true); // 33/99 = 0.333... <= 1/3
    });

    it('HPがちょうど1/4の場合、trueを返す', () => {
      const effect = new TestHpQuarterDamageEffect();
      const pokemon = createBattlePokemonStatus({ currentHp: 25, maxHp: 100 });

      const result = effect['checkHpThreshold'](pokemon);

      expect(result).toBe(true);
    });
  });
});

