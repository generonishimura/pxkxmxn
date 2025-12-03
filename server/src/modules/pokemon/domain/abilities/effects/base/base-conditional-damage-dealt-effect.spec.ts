import { BaseConditionalDamageDealtEffect } from './base-conditional-damage-dealt-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

/**
 * テスト用の具象クラス（HP満タンで1.5倍）
 */
class TestHpFullDamageDealtEffect extends BaseConditionalDamageDealtEffect {
  protected readonly conditionType = 'hpFull' as const;
  protected readonly damageMultiplier = 1.5;
}

/**
 * テスト用の具象クラス（HP半分以下で2倍）
 */
class TestHpHalfDamageDealtEffect extends BaseConditionalDamageDealtEffect {
  protected readonly conditionType = 'hpHalf' as const;
  protected readonly damageMultiplier = 2.0;
}

/**
 * テスト用の具象クラス（HP1/4以下で1.5倍）
 */
class TestHpQuarterDamageDealtEffect extends BaseConditionalDamageDealtEffect {
  protected readonly conditionType = 'hpQuarter' as const;
  protected readonly damageMultiplier = 1.5;
}

/**
 * テスト用の具象クラス（状態異常がある場合に1.5倍）
 */
class TestStatusConditionDamageDealtEffect extends BaseConditionalDamageDealtEffect {
  protected readonly conditionType = 'statusCondition' as const;
  protected readonly damageMultiplier = 1.5;
}

/**
 * テスト用の具象クラス（カスタム条件：HPが75以上で1.5倍）
 */
class TestCustomConditionDamageDealtEffect extends BaseConditionalDamageDealtEffect {
  protected readonly conditionType = 'custom' as const;
  protected readonly damageMultiplier = 1.5;

  protected checkCustomCondition(
    pokemon: BattlePokemonStatus,
    _damage: number,
    _battleContext?: BattleContext,
  ): boolean {
    return pokemon.currentHp >= 75;
  }
}

describe('BaseConditionalDamageDealtEffect', () => {
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

  const createBattleContext = (): BattleContext => ({
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
  });

  describe('modifyDamageDealt - hpFull', () => {
    it('HPが満タンの場合、ダメージが1.5倍になる', () => {
      const effect = new TestHpFullDamageDealtEffect();
      const pokemon = createBattlePokemonStatus({
        currentHp: 100,
        maxHp: 100,
      });
      const damage = 100;
      const battleContext = createBattleContext();

      const result = effect.modifyDamageDealt(pokemon, damage, battleContext);

      expect(result).toBe(150);
    });

    it('HPが満タンでない場合、ダメージが変更されない', () => {
      const effect = new TestHpFullDamageDealtEffect();
      const pokemon = createBattlePokemonStatus({
        currentHp: 99,
        maxHp: 100,
      });
      const damage = 100;
      const battleContext = createBattleContext();

      const result = effect.modifyDamageDealt(pokemon, damage, battleContext);

      expect(result).toBeUndefined();
    });
  });

  describe('modifyDamageDealt - hpHalf', () => {
    it('HPが半分以下の場合、ダメージが2倍になる', () => {
      const effect = new TestHpHalfDamageDealtEffect();
      const pokemon = createBattlePokemonStatus({
        currentHp: 50,
        maxHp: 100,
      });
      const damage = 100;
      const battleContext = createBattleContext();

      const result = effect.modifyDamageDealt(pokemon, damage, battleContext);

      expect(result).toBe(200);
    });

    it('HPが半分より大きい場合、ダメージが変更されない', () => {
      const effect = new TestHpHalfDamageDealtEffect();
      const pokemon = createBattlePokemonStatus({
        currentHp: 51,
        maxHp: 100,
      });
      const damage = 100;
      const battleContext = createBattleContext();

      const result = effect.modifyDamageDealt(pokemon, damage, battleContext);

      expect(result).toBeUndefined();
    });
  });

  describe('modifyDamageDealt - hpQuarter', () => {
    it('HPが1/4以下の場合、ダメージが1.5倍になる', () => {
      const effect = new TestHpQuarterDamageDealtEffect();
      const pokemon = createBattlePokemonStatus({
        currentHp: 25,
        maxHp: 100,
      });
      const damage = 100;
      const battleContext = createBattleContext();

      const result = effect.modifyDamageDealt(pokemon, damage, battleContext);

      expect(result).toBe(150);
    });

    it('HPが1/4より大きい場合、ダメージが変更されない', () => {
      const effect = new TestHpQuarterDamageDealtEffect();
      const pokemon = createBattlePokemonStatus({
        currentHp: 26,
        maxHp: 100,
      });
      const damage = 100;
      const battleContext = createBattleContext();

      const result = effect.modifyDamageDealt(pokemon, damage, battleContext);

      expect(result).toBeUndefined();
    });
  });

  describe('modifyDamageDealt - statusCondition', () => {
    it('状態異常がある場合、ダメージが1.5倍になる', () => {
      const effect = new TestStatusConditionDamageDealtEffect();
      const pokemon = createBattlePokemonStatus({
        statusCondition: StatusCondition.Burn,
      });
      const damage = 100;
      const battleContext = createBattleContext();

      const result = effect.modifyDamageDealt(pokemon, damage, battleContext);

      expect(result).toBe(150);
    });

    it('状態異常がない場合、ダメージが変更されない', () => {
      const effect = new TestStatusConditionDamageDealtEffect();
      const pokemon = createBattlePokemonStatus({
        statusCondition: StatusCondition.None,
      });
      const damage = 100;
      const battleContext = createBattleContext();

      const result = effect.modifyDamageDealt(pokemon, damage, battleContext);

      expect(result).toBeUndefined();
    });

    it('状態異常がnullの場合、ダメージが変更されない', () => {
      const effect = new TestStatusConditionDamageDealtEffect();
      const pokemon = createBattlePokemonStatus({
        statusCondition: null,
      });
      const damage = 100;
      const battleContext = createBattleContext();

      const result = effect.modifyDamageDealt(pokemon, damage, battleContext);

      expect(result).toBeUndefined();
    });
  });

  describe('modifyDamageDealt - custom', () => {
    it('カスタム条件を満たす場合、ダメージが1.5倍になる', () => {
      const effect = new TestCustomConditionDamageDealtEffect();
      const pokemon = createBattlePokemonStatus({
        currentHp: 75,
        maxHp: 100,
      });
      const damage = 100;
      const battleContext = createBattleContext();

      const result = effect.modifyDamageDealt(pokemon, damage, battleContext);

      expect(result).toBe(150);
    });

    it('カスタム条件を満たさない場合、ダメージが変更されない', () => {
      const effect = new TestCustomConditionDamageDealtEffect();
      const pokemon = createBattlePokemonStatus({
        currentHp: 74,
        maxHp: 100,
      });
      const damage = 100;
      const battleContext = createBattleContext();

      const result = effect.modifyDamageDealt(pokemon, damage, battleContext);

      expect(result).toBeUndefined();
    });
  });
});

