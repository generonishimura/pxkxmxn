import { BulletproofEffect } from './bulletproof-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Battle, BattleStatus, Weather } from '@/modules/battle/domain/entities/battle.entity';
import { BattleContext } from '../../battle-context.interface';
import { MoveFlags } from '../../../moves/move-flags';

describe('BulletproofEffect', () => {
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);
  const createContext = (moveName: string): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, Weather.None, null, BattleStatus.Active, null),
    moveName,
    moveFlags: MoveFlags.get(moveName),
  });

  describe('isImmuneToMove', () => {
    it('弾の技（シャドーボール）を無効にする', () => {
      // Act
      const result = new BulletproofEffect().isImmuneToMove(
        pokemon,
        createContext('シャドーボール'),
      );

      // Assert
      expect(result).toBe(true);
    });

    it('弾の技（ヘドロばくだん）を無効にする', () => {
      // Act
      const result = new BulletproofEffect().isImmuneToMove(
        pokemon,
        createContext('ヘドロばくだん'),
      );

      // Assert
      expect(result).toBe(true);
    });

    it('弾の技でない技は無効にしない', () => {
      // Act
      const result = new BulletproofEffect().isImmuneToMove(
        pokemon,
        createContext('ハイパーボイス'),
      );

      // Assert
      expect(result).toBe(false);
    });

    it('コンテキストがない場合は無効にしない', () => {
      // Act
      const result = new BulletproofEffect().isImmuneToMove(pokemon, undefined);

      // Assert
      expect(result).toBe(false);
    });
  });
});
