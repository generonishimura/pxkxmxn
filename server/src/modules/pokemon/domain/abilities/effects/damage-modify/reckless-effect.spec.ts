import { RecklessEffect } from './reckless-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus, Weather } from '@/modules/battle/domain/entities/battle.entity';

describe('RecklessEffect', () => {
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);
  const createContext = (hasRecoil?: boolean): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, Weather.None, null, BattleStatus.Active, null),
    hasRecoil,
  });

  describe('modifyBasePower', () => {
    it('反動のある技は威力を1.2倍（4915/4096）にする', () => {
      // Act
      const result = new RecklessEffect().modifyBasePower(pokemon, 120, createContext(true));

      // Assert
      expect(result).toBe(144);
    });

    it('4096分率の丸めで計算する（100 → 120）', () => {
      // Act
      const result = new RecklessEffect().modifyBasePower(pokemon, 100, createContext(true));

      // Assert
      expect(result).toBe(120);
    });

    it('反動のない技は補正しない', () => {
      // Act
      const result = new RecklessEffect().modifyBasePower(pokemon, 120, createContext(false));

      // Assert
      expect(result).toBeUndefined();
    });

    it('コンテキストがない場合は補正しない', () => {
      // Act
      const result = new RecklessEffect().modifyBasePower(pokemon, 120, undefined);

      // Assert
      expect(result).toBeUndefined();
    });
  });

  it('ダメージ段階の補正（modifyDamageDealt）は持たない', () => {
    // Act
    const effect = new RecklessEffect();

    // Assert
    expect('modifyDamageDealt' in effect).toBe(false);
  });
});
