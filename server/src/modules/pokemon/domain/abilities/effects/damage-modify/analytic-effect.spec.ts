import { AnalyticEffect } from './analytic-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

describe('AnalyticEffect', () => {
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  describe('modifyBasePower', () => {
    it('このターン最後に行動するとき、威力を1.3倍（5325/4096）にする', () => {
      // Arrange
      const battleContext = { isLastToMove: true } as BattleContext;

      // Act
      const result = new AnalyticEffect().modifyBasePower(pokemon, 100, battleContext);

      // Assert
      expect(result).toBe(130);
    });

    it('4096分率で丸める（80 → 104.003 は104）', () => {
      // Arrange
      const battleContext = { isLastToMove: true } as BattleContext;

      // Act
      const result = new AnalyticEffect().modifyBasePower(pokemon, 80, battleContext);

      // Assert
      expect(result).toBe(104);
    });

    it('4096分率で四捨五入する（75 → 97.503 は98。切り捨てなら97になる）', () => {
      // Arrange
      const battleContext = { isLastToMove: true } as BattleContext;

      // Act
      const result = new AnalyticEffect().modifyBasePower(pokemon, 75, battleContext);

      // Assert
      expect(result).toBe(98);
    });

    it('このあとに相手が行動するときは補正しない', () => {
      // Arrange
      const battleContext = { isLastToMove: false } as BattleContext;

      // Act
      const result = new AnalyticEffect().modifyBasePower(pokemon, 100, battleContext);

      // Assert
      expect(result).toBeUndefined();
    });

    it('行動順の情報がないときは補正しない', () => {
      // Act
      const result = new AnalyticEffect().modifyBasePower(pokemon, 100, {} as BattleContext);

      // Assert
      expect(result).toBeUndefined();
    });

    it('コンテキストがないときは補正しない', () => {
      // Act
      const result = new AnalyticEffect().modifyBasePower(pokemon, 100);

      // Assert
      expect(result).toBeUndefined();
    });
  });

  it('ダメージ段階の補正（modifyDamageDealt）は持たない', () => {
    // Act
    const effect = new AnalyticEffect();

    // Assert
    expect('modifyDamageDealt' in effect).toBe(false);
  });
});
