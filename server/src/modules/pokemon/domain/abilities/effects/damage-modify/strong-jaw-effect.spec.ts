import { StrongJawEffect } from './strong-jaw-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Battle, BattleStatus, Weather } from '@/modules/battle/domain/entities/battle.entity';
import { BattleContext } from '../../battle-context.interface';
import { MoveFlags } from '../../../moves/move-flags';

describe('StrongJawEffect', () => {
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);
  const createContext = (moveName: string): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, Weather.None, null, BattleStatus.Active, null),
    moveName,
    moveFlags: MoveFlags.get(moveName),
  });

  describe('modifyBasePower', () => {
    it('かみつき技（かみくだく）の威力を1.5倍（6144/4096）にする', () => {
      // Act
      const result = new StrongJawEffect().modifyBasePower(
        pokemon,
        80,
        createContext('かみくだく'),
      );

      // Assert
      expect(result).toBe(120);
    });

    it('4096分率の丸めで計算する（65 → 97.5 は五捨五超入で97）', () => {
      // Act
      const result = new StrongJawEffect().modifyBasePower(
        pokemon,
        65,
        createContext('かみくだく'),
      );

      // Assert
      expect(result).toBe(97);
    });

    it('かみつき技でない技は補正しない', () => {
      // Act
      const result = new StrongJawEffect().modifyBasePower(
        pokemon,
        75,
        createContext('ほのおのパンチ'),
      );

      // Assert
      expect(result).toBeUndefined();
    });

    it('コンテキストがない場合は補正しない', () => {
      // Act
      const result = new StrongJawEffect().modifyBasePower(pokemon, 80, undefined);

      // Assert
      expect(result).toBeUndefined();
    });
  });
});
