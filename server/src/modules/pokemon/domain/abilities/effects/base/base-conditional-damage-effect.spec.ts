import { BaseConditionalDamageEffect } from './base-conditional-damage-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * テスト用の具象クラス（HP満タンで半減）
 */
class TestHpFullDamageEffect extends BaseConditionalDamageEffect {
  protected readonly conditionType = 'hpFull' as const;
  protected readonly damageMultiplier = 0.5;
}

/**
 * テスト用の具象クラス（HP半分以下で1.5倍）
 */
class TestHpHalfDamageEffect extends BaseConditionalDamageEffect {
  protected readonly conditionType = 'hpHalf' as const;
  protected readonly damageMultiplier = 1.5;
}

/**
 * テスト用の具象クラス（HP1/4以下で2倍）
 */
class TestHpQuarterDamageEffect extends BaseConditionalDamageEffect {
  protected readonly conditionType = 'hpQuarter' as const;
  protected readonly damageMultiplier = 2.0;
}

/**
 * テスト用の具象クラス（状態異常がある場合に1.5倍）
 */
class TestStatusConditionDamageEffect extends BaseConditionalDamageEffect {
  protected readonly conditionType = 'statusCondition' as const;
  protected readonly damageMultiplier = 1.5;
}

/**
 * テスト用の具象クラス（カスタム条件：HPが75以上で半減）
 */
class TestCustomConditionDamageEffect extends BaseConditionalDamageEffect {
  protected readonly conditionType = 'custom' as const;
  protected readonly damageMultiplier = 0.5;

  protected checkCustomCondition(
    pokemon: BattlePokemonStatus,
    _damage: number,
    _battleContext?: BattleContext,
  ): boolean {
    return pokemon.currentHp >= 75;
  }
}

describe('BaseConditionalDamageEffect', () => {
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

  describe('modifyDamage - hpFull', () => {
    it('HPが満タンの場合、ダメージが半減する', () => {
      const effect = new TestHpFullDamageEffect();
      const pokemon = createBattlePokemonStatus({
        currentHp: 100,
        maxHp: 100,
      });
      const damage = 100;

      const result = effect.modifyDamage(pokemon, damage);

      expect(result).toBe(50);
    });

    it('HPが満タンでない場合、ダメージが変更されない', () => {
      const effect = new TestHpFullDamageEffect();
      const pokemon = createBattlePokemonStatus({
        currentHp: 99,
        maxHp: 100,
      });
      const damage = 100;

      const result = effect.modifyDamage(pokemon, damage);

      expect(result).toBe(100);
    });
  });

  describe('modifyDamage - hpHalf', () => {
    it('HPが半分以下の場合、ダメージが1.5倍になる', () => {
      const effect = new TestHpHalfDamageEffect();
      const pokemon = createBattlePokemonStatus({
        currentHp: 50,
        maxHp: 100,
      });
      const damage = 100;

      const result = effect.modifyDamage(pokemon, damage);

      expect(result).toBe(150);
    });

    it('HPが半分より大きい場合、ダメージが変更されない', () => {
      const effect = new TestHpHalfDamageEffect();
      const pokemon = createBattlePokemonStatus({
        currentHp: 51,
        maxHp: 100,
      });
      const damage = 100;

      const result = effect.modifyDamage(pokemon, damage);

      expect(result).toBe(100);
    });
  });

  describe('modifyDamage - hpQuarter', () => {
    it('HPが1/4以下の場合、ダメージが2倍になる', () => {
      const effect = new TestHpQuarterDamageEffect();
      const pokemon = createBattlePokemonStatus({
        currentHp: 25,
        maxHp: 100,
      });
      const damage = 100;

      const result = effect.modifyDamage(pokemon, damage);

      expect(result).toBe(200);
    });

    it('HPが1/4より大きい場合、ダメージが変更されない', () => {
      const effect = new TestHpQuarterDamageEffect();
      const pokemon = createBattlePokemonStatus({
        currentHp: 26,
        maxHp: 100,
      });
      const damage = 100;

      const result = effect.modifyDamage(pokemon, damage);

      expect(result).toBe(100);
    });
  });

  describe('modifyDamage - statusCondition', () => {
    it('状態異常がある場合、ダメージが1.5倍になる', () => {
      const effect = new TestStatusConditionDamageEffect();
      const pokemon = createBattlePokemonStatus({
        statusCondition: StatusCondition.Burn,
      });
      const damage = 100;

      const result = effect.modifyDamage(pokemon, damage);

      expect(result).toBe(150);
    });

    it('状態異常がない場合、ダメージが変更されない', () => {
      const effect = new TestStatusConditionDamageEffect();
      const pokemon = createBattlePokemonStatus({
        statusCondition: StatusCondition.None,
      });
      const damage = 100;

      const result = effect.modifyDamage(pokemon, damage);

      expect(result).toBe(100);
    });

    it('状態異常がnullの場合、ダメージが変更されない', () => {
      const effect = new TestStatusConditionDamageEffect();
      const pokemon = createBattlePokemonStatus({
        statusCondition: null,
      });
      const damage = 100;

      const result = effect.modifyDamage(pokemon, damage);

      expect(result).toBe(100);
    });
  });

  describe('modifyDamage - custom', () => {
    it('カスタム条件を満たす場合、ダメージが半減する', () => {
      const effect = new TestCustomConditionDamageEffect();
      const pokemon = createBattlePokemonStatus({
        currentHp: 75,
        maxHp: 100,
      });
      const damage = 100;

      const result = effect.modifyDamage(pokemon, damage);

      expect(result).toBe(50);
    });

    it('カスタム条件を満たさない場合、ダメージが変更されない', () => {
      const effect = new TestCustomConditionDamageEffect();
      const pokemon = createBattlePokemonStatus({
        currentHp: 74,
        maxHp: 100,
      });
      const damage = 100;

      const result = effect.modifyDamage(pokemon, damage);

      expect(result).toBe(100);
    });
  });

  describe('modifyDamage - エッジケース', () => {
    it('ダメージが奇数の場合、切り捨てられる', () => {
      const effect = new TestHpFullDamageEffect();
      const pokemon = createBattlePokemonStatus({
        currentHp: 100,
        maxHp: 100,
      });
      const damage = 101;

      const result = effect.modifyDamage(pokemon, damage);

      expect(result).toBe(50); // Math.floor(101 * 0.5) = 50
    });

    it('ダメージが0の場合、0のまま', () => {
      const effect = new TestHpFullDamageEffect();
      const pokemon = createBattlePokemonStatus({
        currentHp: 100,
        maxHp: 100,
      });
      const damage = 0;

      const result = effect.modifyDamage(pokemon, damage);

      expect(result).toBe(0);
    });

    it('battleContextが提供されていなくても動作する', () => {
      const effect = new TestHpFullDamageEffect();
      const pokemon = createBattlePokemonStatus({
        currentHp: 100,
        maxHp: 100,
      });
      const damage = 100;

      const result = effect.modifyDamage(pokemon, damage, undefined);

      expect(result).toBe(50);
    });
  });
});

