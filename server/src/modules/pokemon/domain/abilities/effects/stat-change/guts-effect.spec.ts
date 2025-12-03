import { GutsEffect } from './guts-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattleContext } from '../../battle-context.interface';
import { BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('GutsEffect', () => {
  let effect: GutsEffect;
  let battleContext: BattleContext;

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

  beforeEach(() => {
    effect = new GutsEffect();
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

  describe('modifyDamageDealt', () => {
    it('状態異常がある場合、ダメージが1.5倍になる', () => {
      const pokemon = createBattlePokemonStatus({
        statusCondition: StatusCondition.Burn,
      });
      const damage = 100;

      const result = effect.modifyDamageDealt(pokemon, damage, battleContext);

      expect(result).toBe(150);
    });

    it('状態異常がある場合（やけど）、ダメージが1.5倍になる', () => {
      const pokemon = createBattlePokemonStatus({
        statusCondition: StatusCondition.Burn,
      });
      const damage = 100;

      const result = effect.modifyDamageDealt(pokemon, damage, battleContext);

      expect(result).toBe(150);
    });

    it('状態異常がある場合（どく）、ダメージが1.5倍になる', () => {
      const pokemon = createBattlePokemonStatus({
        statusCondition: StatusCondition.Poison,
      });
      const damage = 100;

      const result = effect.modifyDamageDealt(pokemon, damage, battleContext);

      expect(result).toBe(150);
    });

    it('状態異常がある場合（まひ）、ダメージが1.5倍になる', () => {
      const pokemon = createBattlePokemonStatus({
        statusCondition: StatusCondition.Paralysis,
      });
      const damage = 100;

      const result = effect.modifyDamageDealt(pokemon, damage, battleContext);

      expect(result).toBe(150);
    });

    it('状態異常がない場合、ダメージが変更されない', () => {
      const pokemon = createBattlePokemonStatus({
        statusCondition: StatusCondition.None,
      });
      const damage = 100;

      const result = effect.modifyDamageDealt(pokemon, damage, battleContext);

      expect(result).toBeUndefined();
    });

    it('状態異常がNoneの場合、ダメージが変更されない', () => {
      const pokemon = createBattlePokemonStatus({
        statusCondition: StatusCondition.None,
      });
      const damage = 100;

      const result = effect.modifyDamageDealt(pokemon, damage, battleContext);

      expect(result).toBeUndefined();
    });

    it('状態異常がnullの場合、ダメージが変更されない', () => {
      const pokemon = createBattlePokemonStatus({
        statusCondition: null,
      });
      const damage = 100;

      const result = effect.modifyDamageDealt(pokemon, damage, battleContext);

      expect(result).toBeUndefined();
    });

    it('ダメージが0の場合、0を返す', () => {
      const pokemon = createBattlePokemonStatus({
        statusCondition: StatusCondition.Burn,
      });
      const damage = 0;

      const result = effect.modifyDamageDealt(pokemon, damage, battleContext);

      expect(result).toBe(0);
    });

    it('ダメージが小数の場合、切り捨てて計算する', () => {
      const pokemon = createBattlePokemonStatus({
        statusCondition: StatusCondition.Burn,
      });
      const damage = 101;

      const result = effect.modifyDamageDealt(pokemon, damage, battleContext);

      expect(result).toBe(151); // 101 * 1.5 = 151.5 → 151
    });
  });
});

