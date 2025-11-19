import { MultiscaleEffect } from './multiscale-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

describe('MultiscaleEffect', () => {
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

  describe('modifyDamage', () => {
    it('HPが満タンの場合、ダメージが半減する', () => {
      const effect = new MultiscaleEffect();
      const pokemon = createBattlePokemonStatus({
        currentHp: 100,
        maxHp: 100, // HP満タン
      });
      const damage = 100;

      const result = effect.modifyDamage(pokemon, damage);

      expect(result).toBe(50); // 100 / 2 = 50
    });

    it('HPが満タンでない場合、ダメージが変更されない', () => {
      const effect = new MultiscaleEffect();
      const pokemon = createBattlePokemonStatus({
        currentHp: 50,
        maxHp: 100, // HP満タンではない
      });
      const damage = 100;

      const result = effect.modifyDamage(pokemon, damage);

      expect(result).toBe(100); // 変更なし
    });

    it('HPが1減っている場合、ダメージが変更されない', () => {
      const effect = new MultiscaleEffect();
      const pokemon = createBattlePokemonStatus({
        currentHp: 99,
        maxHp: 100, // HP満タンではない
      });
      const damage = 100;

      const result = effect.modifyDamage(pokemon, damage);

      expect(result).toBe(100); // 変更なし
    });

    it('HPが0の場合、ダメージが変更されない', () => {
      const effect = new MultiscaleEffect();
      const pokemon = createBattlePokemonStatus({
        currentHp: 0,
        maxHp: 100,
      });
      const damage = 100;

      const result = effect.modifyDamage(pokemon, damage);

      expect(result).toBe(100); // 変更なし
    });

    it('ダメージが奇数の場合、切り捨てられる', () => {
      const effect = new MultiscaleEffect();
      const pokemon = createBattlePokemonStatus({
        currentHp: 100,
        maxHp: 100, // HP満タン
      });
      const damage = 101; // 奇数

      const result = effect.modifyDamage(pokemon, damage);

      expect(result).toBe(50); // Math.floor(101 / 2) = 50
    });

    it('ダメージが1の場合、半減して0になる', () => {
      const effect = new MultiscaleEffect();
      const pokemon = createBattlePokemonStatus({
        currentHp: 100,
        maxHp: 100, // HP満タン
      });
      const damage = 1;

      const result = effect.modifyDamage(pokemon, damage);

      expect(result).toBe(0); // Math.floor(1 / 2) = 0
    });

    it('ダメージが2の場合、半減して1になる', () => {
      const effect = new MultiscaleEffect();
      const pokemon = createBattlePokemonStatus({
        currentHp: 100,
        maxHp: 100, // HP満タン
      });
      const damage = 2;

      const result = effect.modifyDamage(pokemon, damage);

      expect(result).toBe(1); // Math.floor(2 / 2) = 1
    });

    it('HPが満タンで、ダメージが大きい場合でも正しく半減する', () => {
      const effect = new MultiscaleEffect();
      const pokemon = createBattlePokemonStatus({
        currentHp: 200,
        maxHp: 200, // HP満タン
      });
      const damage = 1000;

      const result = effect.modifyDamage(pokemon, damage);

      expect(result).toBe(500); // 1000 / 2 = 500
    });

    it('battleContextが提供されていなくても動作する', () => {
      const effect = new MultiscaleEffect();
      const pokemon = createBattlePokemonStatus({
        currentHp: 100,
        maxHp: 100, // HP満タン
      });
      const damage = 100;

      const result = effect.modifyDamage(pokemon, damage, undefined);

      expect(result).toBe(50); // battleContextは使用されない
    });

    it('battleContextが提供されていても動作する', () => {
      const effect = new MultiscaleEffect();
      const pokemon = createBattlePokemonStatus({
        currentHp: 100,
        maxHp: 100, // HP満タン
      });
      const damage = 100;
      const battleContext: BattleContext = {
        battle: {
          id: 1,
          trainer1Id: 1,
          trainer2Id: 2,
          team1Id: 1,
          team2Id: 2,
          turn: 1,
          weather: null,
          field: null,
          status: 'Active' as any,
          winnerTrainerId: null,
        },
      };

      const result = effect.modifyDamage(pokemon, damage, battleContext);

      expect(result).toBe(50); // battleContextは使用されないが、エラーは発生しない
    });

    it('HPが満タンで、ダメージが0の場合、0のまま', () => {
      const effect = new MultiscaleEffect();
      const pokemon = createBattlePokemonStatus({
        currentHp: 100,
        maxHp: 100, // HP満タン
      });
      const damage = 0;

      const result = effect.modifyDamage(pokemon, damage);

      expect(result).toBe(0); // Math.floor(0 / 2) = 0
    });
  });
});

