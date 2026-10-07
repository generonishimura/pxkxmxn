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

  describe('modifyFractionalPriority', () => {
    it.each([['Physical' as const], ['Special' as const]])(
      '%s の技で30%%の判定に当たると、優先度に +0.1 を足す',
      category => {
        // Arrange
        jest.spyOn(Math, 'random').mockReturnValue(0.29);

        // Act
        const result = effect.modifyFractionalPriority(pokemon, createCtx(category));

        // Assert
        expect(result).toBe(0.1);
      },
    );

    it('30%の判定に外れると優先度を変えない', () => {
      // Arrange
      jest.spyOn(Math, 'random').mockReturnValue(0.3);

      // Act
      const result = effect.modifyFractionalPriority(pokemon, createCtx('Physical'));

      // Assert
      expect(result).toBeUndefined();
    });

    it('変化技では判定をせず、優先度を変えない', () => {
      // Arrange
      const random = jest.spyOn(Math, 'random').mockReturnValue(0);

      // Act
      const result = effect.modifyFractionalPriority(pokemon, createCtx('Status'));

      // Assert
      expect(result).toBeUndefined();
      expect(random).not.toHaveBeenCalled();
    });

    it('技の分類が分からないときは優先度を変えない', () => {
      // Arrange
      jest.spyOn(Math, 'random').mockReturnValue(0);

      // Act
      const result = effect.modifyFractionalPriority(pokemon, createCtx(undefined));

      // Assert
      expect(result).toBeUndefined();
    });
  });

  it('素早さは変えない（トリックルームで順番が逆にならない）', () => {
    // Assert
    expect('modifySpeed' in effect).toBe(false);
  });
});
