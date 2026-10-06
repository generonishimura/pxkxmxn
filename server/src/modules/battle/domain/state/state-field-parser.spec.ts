import { applyStatePatch, removalPatch, tickTurnCount } from './state-field-parser';

describe('state-field-parser', () => {
  describe('tickTurnCount', () => {
    it.each([
      [5, 4],
      [2, 1],
    ])('残りターン数 %p は %p になる', (turns, expected) => {
      // Act
      const ticked = tickTurnCount(turns);

      // Assert
      expect(ticked).toBe(expected);
    });

    it.each([1, 0])('残りターン数 %p は undefined（キーを消す）になる', turns => {
      // Act
      const ticked = tickTurnCount(turns);

      // Assert
      expect(ticked).toBeUndefined();
    });
  });

  describe('removalPatch', () => {
    it('当てると、指定したキーだけを取り除く patch を返す', () => {
      // Arrange
      type State = { readonly a?: number; readonly b?: boolean; readonly c?: string };
      const state: State = { a: 1, b: true, c: 'x' };

      // Act
      const patched = applyStatePatch(state, removalPatch<State>(['a', 'b']));

      // Assert
      expect(patched).toEqual({ c: 'x' });
    });
  });
});
