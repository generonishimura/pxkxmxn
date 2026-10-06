import { OvercoatEffect } from './overcoat-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Battle, BattleStatus, Weather } from '@/modules/battle/domain/entities/battle.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattleContext } from '../../battle-context.interface';
import { MoveFlags } from '../../../moves/move-flags';
import { EffectSource } from '../../../battle-events/effect-source';

describe('OvercoatEffect', () => {
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);
  const opponent = new BattlePokemonStatus(2, 1, 2, 2, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);
  const createContext = (moveName: string): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, Weather.None, null, BattleStatus.Active, null),
    moveName,
    moveFlags: MoveFlags.get(moveName),
  });

  describe('isImmuneToMove', () => {
    it('粉の技（キノコのほうし）を無効にする', () => {
      // Act
      const result = new OvercoatEffect().isImmuneToMove(pokemon, createContext('キノコのほうし'));

      // Assert
      expect(result).toBe(true);
    });

    it('粉の技でない技は無効にしない', () => {
      // Act
      const result = new OvercoatEffect().isImmuneToMove(pokemon, createContext('ほのおのパンチ'));

      // Assert
      expect(result).toBe(false);
    });

    it('コンテキストがない場合は無効にしない', () => {
      // Act
      const result = new OvercoatEffect().isImmuneToMove(pokemon, undefined);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('canReceiveStatusCondition', () => {
    it('相手のほうし（特性）による状態異常を受けない', () => {
      // Arrange
      const source: EffectSource = {
        pokemon: opponent,
        abilityName: 'ほうし',
        kind: 'ability',
        name: 'ほうし',
      };

      // Act
      const result = new OvercoatEffect().canReceiveStatusCondition(
        pokemon,
        StatusCondition.Sleep,
        undefined,
        source,
      );

      // Assert
      expect(result).toBe(false);
    });

    it('ほうし以外の特性による状態異常は受ける', () => {
      // Arrange
      const source: EffectSource = {
        pokemon: opponent,
        abilityName: 'せいでんき',
        kind: 'ability',
        name: 'せいでんき',
      };

      // Act
      const result = new OvercoatEffect().canReceiveStatusCondition(
        pokemon,
        StatusCondition.Paralysis,
        undefined,
        source,
      );

      // Assert
      expect(result).toBeUndefined();
    });

    it('技による状態異常は受ける', () => {
      // Arrange
      const source: EffectSource = { pokemon: opponent, kind: 'move', name: 'でんじは' };

      // Act
      const result = new OvercoatEffect().canReceiveStatusCondition(
        pokemon,
        StatusCondition.Paralysis,
        undefined,
        source,
      );

      // Assert
      expect(result).toBeUndefined();
    });
  });
});
