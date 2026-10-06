import {
  PERSISTENT_POKEMON_STATE_PARSERS,
  PersistentPokemonState,
  emptyPersistentPokemonState,
  parsePersistentPokemonState,
  updatePersistentPokemonState,
} from './persistent-state';

/**
 * PersistentPokemonState のすべてのキーを 1 つずつ持つ状態
 * Required にしているので、キーを足すとここにも足さないとコンパイルが通らない
 */
const FULL_PERSISTENT_STATE: Required<PersistentPokemonState> = {
  sleepTurns: 2,
  form: 'hero',
  disguiseBusted: true,
  iceFaceBroken: true,
  oncePerBattleAbilityUsed: true,
};

describe('PersistentPokemonState', () => {
  describe('emptyPersistentPokemonState', () => {
    it('キーを1つも持たない状態を返す', () => {
      // Act
      const state = emptyPersistentPokemonState();

      // Assert
      expect(state).toEqual({});
    });
  });

  describe('updatePersistentPokemonState', () => {
    it('指定したキーだけを書き換え、元の状態は書き換えない', () => {
      // Arrange
      const state: PersistentPokemonState = { sleepTurns: 2, disguiseBusted: true };

      // Act
      const updated = updatePersistentPokemonState(state, { sleepTurns: 1 });

      // Assert
      expect(updated).toEqual({ sleepTurns: 1, disguiseBusted: true });
      expect(state).toEqual({ sleepTurns: 2, disguiseBusted: true });
    });

    it('null を渡したキーは取り除く', () => {
      // Arrange
      const state: PersistentPokemonState = { sleepTurns: 1, form: 'hero' };

      // Act
      const updated = updatePersistentPokemonState(state, { sleepTurns: null });

      // Assert
      expect(updated).toEqual({ form: 'hero' });
    });
  });

  describe('parsePersistentPokemonState', () => {
    it('すべてのキーを持つ状態を読み込んで、そのまま返す', () => {
      // Act
      const state = parsePersistentPokemonState(FULL_PERSISTENT_STATE);

      // Assert
      expect(state).toEqual(FULL_PERSISTENT_STATE);
    });

    it('読み方の表のキーと PersistentPokemonState のキーが一致する', () => {
      // Act
      const parserKeys = Object.keys(PERSISTENT_POKEMON_STATE_PARSERS).sort();

      // Assert
      expect(parserKeys).toEqual(Object.keys(FULL_PERSISTENT_STATE).sort());
    });

    it('ねむりの残りターン数は 0 を読み込み、負の数は捨てる', () => {
      // Act
      const accepted = parsePersistentPokemonState({ sleepTurns: 0 });
      const rejected = parsePersistentPokemonState({ sleepTurns: -1 });

      // Assert
      expect(accepted).toEqual({ sleepTurns: 0 });
      expect(rejected).toEqual({});
    });

    it.each([null, 'abc', [1]])('オブジェクトでない値 %p は空の状態として読み込む', json => {
      // Act
      const state = parsePersistentPokemonState(json);

      // Assert
      expect(state).toEqual({});
    });

    it('知らないキーと型が合わない値は捨てる', () => {
      // Arrange
      const json = { form: '', disguiseBusted: 'yes', iceFaceBroken: true, extra: 1 };

      // Act
      const state = parsePersistentPokemonState(json);

      // Assert
      expect(state).toEqual({ iceFaceBroken: true });
    });
  });
});
