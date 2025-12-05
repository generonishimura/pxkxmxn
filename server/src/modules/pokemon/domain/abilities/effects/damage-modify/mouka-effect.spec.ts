import { MoukaEffect } from './mouka-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('MoukaEffect', () => {
  let effect: MoukaEffect;

  beforeEach(() => {
    effect = new MoukaEffect();
  });

  describe('modifyDamageDealt', () => {
    it('HPが1/3以下かつほのおタイプの技の場合、ダメージを1.5倍する', () => {
      const pokemon = new BattlePokemonStatus(
        1,
        1,
        1,
        1,
        true,
        30, // currentHp: 30
        100, // maxHp: 100 (1/3以下)
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        null,
      );

      const battleContext: BattleContext = {
        battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
        moveTypeName: 'ほのお',
      };

      const result = effect.modifyDamageDealt(pokemon, 100, battleContext);

      expect(result).toBe(150); // 100 * 1.5 = 150
    });

    it('HPが1/3より大きい場合、ダメージを変更しない', () => {
      const pokemon = new BattlePokemonStatus(
        1,
        1,
        1,
        1,
        true,
        34, // currentHp: 34
        100, // maxHp: 100 (1/3より大きい)
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        null,
      );

      const battleContext: BattleContext = {
        battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
        moveTypeName: 'ほのお',
      };

      const result = effect.modifyDamageDealt(pokemon, 100, battleContext);

      expect(result).toBeUndefined();
    });

    it('ほのおタイプでない技の場合、ダメージを変更しない', () => {
      const pokemon = new BattlePokemonStatus(
        1,
        1,
        1,
        1,
        true,
        30, // currentHp: 30
        100, // maxHp: 100
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        null,
      );

      const battleContext: BattleContext = {
        battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
        moveTypeName: 'くさ',
      };

      const result = effect.modifyDamageDealt(pokemon, 100, battleContext);

      expect(result).toBeUndefined();
    });

    it('HPがちょうど1/3の場合、ダメージを1.5倍する', () => {
      const pokemon = new BattlePokemonStatus(
        1,
        1,
        1,
        1,
        true,
        33, // currentHp: 33
        100, // maxHp: 100 (ちょうど1/3)
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        null,
      );

      const battleContext: BattleContext = {
        battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
        moveTypeName: 'ほのお',
      };

      const result = effect.modifyDamageDealt(pokemon, 100, battleContext);

      expect(result).toBe(150);
    });

    it('moveTypeNameがない場合、ダメージを変更しない', () => {
      const pokemon = new BattlePokemonStatus(
        1,
        1,
        1,
        1,
        true,
        30,
        100,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        null,
      );

      const battleContext: BattleContext = {
        battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
      };

      const result = effect.modifyDamageDealt(pokemon, 100, battleContext);

      expect(result).toBeUndefined();
    });
  });
});

