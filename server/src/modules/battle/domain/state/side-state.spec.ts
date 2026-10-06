import {
  SideState,
  emptySideState,
  getGlobalFieldState,
  getSideConditions,
  parseSideState,
  updateGlobalFieldState,
  updateSideConditions,
} from './side-state';

describe('SideState', () => {
  describe('emptySideState', () => {
    it('キーを1つも持たない状態を返す', () => {
      // Act
      const state = emptySideState();

      // Assert
      expect(state).toEqual({});
    });
  });

  describe('getSideConditions', () => {
    it('トレーナーの陣営の状態を返す', () => {
      // Arrange
      const state: SideState = { sides: { '1': { reflectTurns: 5 }, '2': { spikesLayers: 2 } } };

      // Act
      const conditions = getSideConditions(state, 2);

      // Assert
      expect(conditions).toEqual({ spikesLayers: 2 });
    });

    it('まだ何もない陣営は空の状態を返す', () => {
      // Arrange
      const state = emptySideState();

      // Act
      const conditions = getSideConditions(state, 1);

      // Assert
      expect(conditions).toEqual({});
    });
  });

  describe('updateSideConditions', () => {
    it('指定したトレーナーの陣営だけを書き換える', () => {
      // Arrange
      const state: SideState = { sides: { '1': { reflectTurns: 5 }, '2': { tailwindTurns: 3 } } };

      // Act
      const updated = updateSideConditions(state, 1, { lightScreenTurns: 5 });

      // Assert
      expect(updated).toEqual({
        sides: { '1': { reflectTurns: 5, lightScreenTurns: 5 }, '2': { tailwindTurns: 3 } },
      });
    });

    it('元の状態は書き換えない', () => {
      // Arrange
      const state: SideState = { sides: { '1': { reflectTurns: 5 } } };

      // Act
      updateSideConditions(state, 1, { reflectTurns: 4 });

      // Assert
      expect(state).toEqual({ sides: { '1': { reflectTurns: 5 } } });
    });

    it('undefined を渡したキーは取り除く', () => {
      // Arrange
      const state: SideState = { sides: { '1': { reflectTurns: 1, stealthRock: true } } };

      // Act
      const updated = updateSideConditions(state, 1, { reflectTurns: undefined });

      // Assert
      expect(updated).toEqual({ sides: { '1': { stealthRock: true } } });
    });

    it('陣営の状態が空になったときは陣営のキーごと取り除く', () => {
      // Arrange
      const state: SideState = { sides: { '1': { reflectTurns: 1 } }, global: { gravityTurns: 2 } };

      // Act
      const updated = updateSideConditions(state, 1, { reflectTurns: undefined });

      // Assert
      expect(updated).toEqual({ global: { gravityTurns: 2 } });
    });
  });

  describe('updateGlobalFieldState', () => {
    it('全体の場の状態を書き換え、陣営の状態は残す', () => {
      // Arrange
      const state: SideState = { sides: { '1': { mistTurns: 5 } } };

      // Act
      const updated = updateGlobalFieldState(state, { trickRoomTurns: 5 });

      // Assert
      expect(updated).toEqual({ sides: { '1': { mistTurns: 5 } }, global: { trickRoomTurns: 5 } });
      expect(getGlobalFieldState(updated)).toEqual({ trickRoomTurns: 5 });
    });

    it('全体の場の状態が空になったときは global のキーごと取り除く', () => {
      // Arrange
      const state: SideState = { global: { trickRoomTurns: 1 } };

      // Act
      const updated = updateGlobalFieldState(state, { trickRoomTurns: undefined });

      // Assert
      expect(updated).toEqual({});
    });
  });

  describe('parseSideState', () => {
    it('正しい値はそのまま読み込む', () => {
      // Arrange
      const json = {
        sides: {
          '1': {
            reflectTurns: 5,
            lightScreenTurns: 3,
            auroraVeilTurns: 2,
            tailwindTurns: 4,
            safeguardTurns: 5,
            mistTurns: 5,
            luckyChantTurns: 5,
            spikesLayers: 3,
            toxicSpikesLayers: 2,
            stealthRock: true,
            stickyWeb: true,
            wideGuard: true,
            wish: { turns: 1, healAmount: 80 },
          },
        },
        global: {
          trickRoomTurns: 5,
          gravityTurns: 4,
          wonderRoomTurns: 3,
          magicRoomTurns: 2,
          mudSportTurns: 5,
          waterSportTurns: 5,
          fairyLockTurns: 1,
          terrainTurns: 5,
          ionDeluge: true,
          lastMoveId: 85,
        },
      };

      // Act
      const state = parseSideState(json);

      // Assert
      expect(state).toEqual(json);
    });

    it.each([null, undefined, 'abc', 42, [1]])(
      'オブジェクトでない値 %p は空の状態として読み込む',
      json => {
        // Act
        const state = parseSideState(json);

        // Assert
        expect(state).toEqual({});
      },
    );

    it('知らないキーや型が合わない値は捨てる', () => {
      // Arrange
      const json = {
        version: 2,
        sides: { '1': { reflectTurns: 'five', spikesLayers: 4, stealthRock: true, extra: 1 } },
        global: { trickRoomTurns: -1, gravityTurns: 3 },
      };

      // Act
      const state = parseSideState(json);

      // Assert
      expect(state).toEqual({
        sides: { '1': { stealthRock: true } },
        global: { gravityTurns: 3 },
      });
    });

    it('トレーナーIDとして読めないキーの陣営は捨てる', () => {
      // Arrange
      const json = { sides: { abc: { reflectTurns: 5 }, '0': { mistTurns: 5 }, '2': 'x' } };

      // Act
      const state = parseSideState(json);

      // Assert
      expect(state).toEqual({});
    });
  });
});
