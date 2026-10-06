import {
  VolatileState,
  emptyVolatileState,
  parseVolatileState,
  updateVolatileState,
} from './volatile-state';

describe('VolatileState', () => {
  describe('emptyVolatileState', () => {
    it('キーを1つも持たない状態を返す', () => {
      // Act
      const state = emptyVolatileState();

      // Assert
      expect(state).toEqual({});
    });

    it('呼ぶたびに別のオブジェクトを返す', () => {
      // Act
      const first = emptyVolatileState();
      const second = emptyVolatileState();

      // Assert
      expect(first).not.toBe(second);
    });
  });

  describe('updateVolatileState', () => {
    it('指定したキーだけを書き換えた新しい状態を返す', () => {
      // Arrange
      const state: VolatileState = { leechSeed: true, tauntTurns: 3 };

      // Act
      const updated = updateVolatileState(state, { tauntTurns: 2 });

      // Assert
      expect(updated).toEqual({ leechSeed: true, tauntTurns: 2 });
    });

    it('元の状態は書き換えない', () => {
      // Arrange
      const state: VolatileState = { tauntTurns: 3 };

      // Act
      updateVolatileState(state, { tauntTurns: 2, substituteHp: 25 });

      // Assert
      expect(state).toEqual({ tauntTurns: 3 });
    });

    it('undefined を渡したキーは取り除く', () => {
      // Arrange
      const state: VolatileState = { leechSeed: true, encore: { moveId: 10, turns: 3 } };

      // Act
      const updated = updateVolatileState(state, { encore: undefined });

      // Assert
      expect(updated).toEqual({ leechSeed: true });
      expect('encore' in updated).toBe(false);
    });

    it('null を渡したキーも取り除く', () => {
      // Arrange
      const state: VolatileState = { protectCount: 2 };

      // Act
      const updated = updateVolatileState(state, { protectCount: null });

      // Assert
      expect(updated).toEqual({});
    });
  });

  describe('parseVolatileState', () => {
    it('正しい値はそのまま読み込む', () => {
      // Arrange
      const json = {
        confusionTurns: 2,
        leechSeed: true,
        substituteHp: 51,
        tauntTurns: 3,
        encore: { moveId: 12, turns: 3 },
        disable: { moveId: 7, turns: 4 },
        choiceLockedMoveId: 33,
        lockedInMove: { moveId: 253, turns: 2 },
        chargingMoveId: 601,
        protectCount: 1,
        protection: 'kingsShield',
        typeOverride: [14],
        addedTypeId: 8,
        abilityOverride: 'たんじゅん',
        statOverrides: { attack: 120, defense: 80 },
        form: 'blade',
        trappedByStatusId: 2,
        octolock: true,
        stockpileCount: 3,
        perishCount: 2,
        switchedInTurn: 4,
      };

      // Act
      const state = parseVolatileState(json);

      // Assert
      expect(state).toEqual(json);
    });

    it.each([null, undefined, 'abc', 42, true, [1, 2]])(
      'オブジェクトでない値 %p は空の状態として読み込む',
      json => {
        // Act
        const state = parseVolatileState(json);

        // Assert
        expect(state).toEqual({});
      },
    );

    it('知らないキーは捨てる', () => {
      // Arrange
      const json = { leechSeed: true, futureField: 'x' };

      // Act
      const state = parseVolatileState(json);

      // Assert
      expect(state).toEqual({ leechSeed: true });
    });

    it('型が合わない値は捨てて、ほかのキーは残す', () => {
      // Arrange
      const json = {
        tauntTurns: 'three',
        substituteHp: 1.5,
        leechSeed: 'yes',
        protection: 'unknownGuard',
        typeOverride: [14, 'ghost'],
        encore: { moveId: 12 },
        aquaRing: true,
      };

      // Act
      const state = parseVolatileState(json);

      // Assert
      expect(state).toEqual({ aquaRing: true });
    });

    it('負のターン数や範囲外の段階は捨てる', () => {
      // Arrange
      const json = { tauntTurns: -1, stockpileCount: 4, perishCount: 3 };

      // Act
      const state = parseVolatileState(json);

      // Assert
      expect(state).toEqual({ perishCount: 3 });
    });

    it('入れ子のオブジェクトの知らないキーも捨てる', () => {
      // Arrange
      const json = { statOverrides: { speed: 90, hp: 200 } };

      // Act
      const state = parseVolatileState(json);

      // Assert
      expect(state).toEqual({ statOverrides: { speed: 90 } });
    });

    it('入れ子のオブジェクトが空になったときはキーごと捨てる', () => {
      // Arrange
      const json = { statOverrides: { hp: 200 } };

      // Act
      const state = parseVolatileState(json);

      // Assert
      expect(state).toEqual({});
    });

    it('読み込んだ結果は元の JSON と別のオブジェクトになる', () => {
      // Arrange
      const json = { encore: { moveId: 12, turns: 3 } };

      // Act
      const state = parseVolatileState(json);

      // Assert
      expect(state.encore).not.toBe(json.encore);
    });
  });
});
