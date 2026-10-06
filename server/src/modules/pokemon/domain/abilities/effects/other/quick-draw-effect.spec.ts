import { QuickDrawEffect } from './quick-draw-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { BattleContext } from '../../battle-context.interface';

describe('QuickDrawEffect（クイックドロウ）', () => {
  const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);
  const createCtx = (moveCategory?: 'Physical' | 'Special' | 'Status'): BattleContext => ({
    battle,
    moveCategory,
  });

  let effect: QuickDrawEffect;

  beforeEach(() => {
    effect = new QuickDrawEffect();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('modifySpeed', () => {
    it.each([['Physical' as const], ['Special' as const]])(
      '%s の技で30%%の判定に当たると、どんな素早さよりも速くする',
      category => {
        // Arrange
        jest.spyOn(Math, 'random').mockReturnValue(0.29);

        // Act
        const result = effect.modifySpeed(pokemon, 50, createCtx(category));

        // Assert
        expect(result).toBeGreaterThan(100000);
      },
    );

    it('30%の判定に外れると素早さを変えない', () => {
      // Arrange
      jest.spyOn(Math, 'random').mockReturnValue(0.3);

      // Act
      const result = effect.modifySpeed(pokemon, 50, createCtx('Physical'));

      // Assert
      expect(result).toBeUndefined();
    });

    it('変化技では判定をせず、素早さを変えない', () => {
      // Arrange
      const random = jest.spyOn(Math, 'random').mockReturnValue(0);

      // Act
      const result = effect.modifySpeed(pokemon, 50, createCtx('Status'));

      // Assert
      expect(result).toBeUndefined();
      expect(random).not.toHaveBeenCalled();
    });

    it('技の分類が分からないときは素早さを変えない', () => {
      // Arrange
      jest.spyOn(Math, 'random').mockReturnValue(0);

      // Act
      const result = effect.modifySpeed(pokemon, 50, createCtx(undefined));

      // Assert
      expect(result).toBeUndefined();
    });

    it('両方が発動したときは、もとの素早さの順番を保つ', () => {
      // Arrange
      jest.spyOn(Math, 'random').mockReturnValue(0);

      // Act
      const faster = effect.modifySpeed(pokemon, 120, createCtx('Physical'));
      const slower = effect.modifySpeed(pokemon, 80, createCtx('Physical'));

      // Assert
      expect(faster).toBeGreaterThan(slower ?? 0);
    });
  });
});
