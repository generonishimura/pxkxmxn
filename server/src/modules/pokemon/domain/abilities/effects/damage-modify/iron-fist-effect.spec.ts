import { IronFistEffect } from './iron-fist-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Battle, BattleStatus, Weather } from '@/modules/battle/domain/entities/battle.entity';
import { BattleContext } from '../../battle-context.interface';
import { MoveFlags } from '../../../moves/move-flags';

describe('IronFistEffect', () => {
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);
  const createContext = (moveName: string): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, Weather.None, null, BattleStatus.Active, null),
    moveName,
    moveFlags: MoveFlags.get(moveName),
  });

  describe('modifyBasePower', () => {
    it('パンチ技（ほのおのパンチ）の威力を1.2倍（4915/4096）にする', () => {
      // Act
      const result = new IronFistEffect().modifyBasePower(
        pokemon,
        75,
        createContext('ほのおのパンチ'),
      );

      // Assert
      expect(result).toBe(90);
    });

    it('4096分率の丸めで計算する（40 → 48）', () => {
      // Act
      const result = new IronFistEffect().modifyBasePower(
        pokemon,
        40,
        createContext('ほのおのパンチ'),
      );

      // Assert
      expect(result).toBe(48);
    });

    it('パンチ技でない技は補正しない', () => {
      // Act
      const result = new IronFistEffect().modifyBasePower(pokemon, 80, createContext('かみくだく'));

      // Assert
      expect(result).toBeUndefined();
    });

    it('コンテキストがない場合は補正しない', () => {
      // Act
      const result = new IronFistEffect().modifyBasePower(pokemon, 75, undefined);

      // Assert
      expect(result).toBeUndefined();
    });
  });
});
