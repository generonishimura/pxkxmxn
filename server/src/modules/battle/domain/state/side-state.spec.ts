import {
  GLOBAL_FIELD_STATE_PARSERS,
  GLOBAL_TURN_COUNTER_KEYS,
  GlobalFieldState,
  SIDE_CONDITIONS_PARSERS,
  SIDE_TURN_COUNTER_KEYS,
  SideConditions,
  SideState,
  emptySideState,
  getGlobalFieldState,
  getSideConditions,
  parseSideState,
  swapCourtChangeConditions,
  tickSideStateAtTurnEnd,
  updateGlobalFieldState,
  updateSideConditions,
} from './side-state';

/**
 * SideConditions のすべてのキーを 1 つずつ持つ陣営
 * Required にしているので、SideConditions にキーを足すとここにも足さないとコンパイルが通らない
 */
const FULL_SIDE_CONDITIONS: Required<SideConditions> = {
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
  quickGuard: true,
  craftyShield: true,
  matBlock: true,
  wish: { turns: 1, healAmount: 80 },
  healingWish: 'lunarDance',
  pendingChoice: { reason: 'revivalBlessing' },
  futureAttack: { turns: 2, moveId: 248, sourceStatusId: 3 },
};

/**
 * GlobalFieldState のすべてのキーを 1 つずつ持つ状態
 */
const FULL_GLOBAL_FIELD_STATE: Required<GlobalFieldState> = {
  weatherTurns: 5,
  weatherSourceStatusId: 3,
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
};

/**
 * 陣営の数値のキーの下限。[キー, 読み込む最小の値, 捨てる値]
 */
const SIDE_LOWER_BOUNDS: ReadonlyArray<readonly [keyof SideConditions, number, number]> = [
  ['reflectTurns', 0, -1],
  ['lightScreenTurns', 0, -1],
  ['auroraVeilTurns', 0, -1],
  ['tailwindTurns', 0, -1],
  ['safeguardTurns', 0, -1],
  ['mistTurns', 0, -1],
  ['luckyChantTurns', 0, -1],
  ['spikesLayers', 1, 0],
  ['toxicSpikesLayers', 1, 0],
];

/**
 * 陣営の上限のある数値のキー。[キー, 読み込む最大の値, 捨てる値]
 */
const SIDE_UPPER_BOUNDS: ReadonlyArray<readonly [keyof SideConditions, number, number]> = [
  ['spikesLayers', 3, 4],
  ['toxicSpikesLayers', 2, 3],
];

const readSide = (conditions: object): SideConditions =>
  getSideConditions(parseSideState({ sides: { '1': conditions } }), 1);

/**
 * 全体の数値のキーの下限。[キー, 読み込む最小の値, 捨てる値]
 */
const GLOBAL_LOWER_BOUNDS: ReadonlyArray<readonly [keyof GlobalFieldState, number, number]> = [
  ['weatherTurns', 0, -1],
  ['weatherSourceStatusId', 1, 0],
  ['trickRoomTurns', 0, -1],
  ['gravityTurns', 0, -1],
  ['wonderRoomTurns', 0, -1],
  ['magicRoomTurns', 0, -1],
  ['mudSportTurns', 0, -1],
  ['waterSportTurns', 0, -1],
  ['fairyLockTurns', 0, -1],
  ['terrainTurns', 0, -1],
  ['lastMoveId', 1, 0],
];

const numberKeysOf = (state: object): string[] =>
  Object.entries(state)
    .filter(([, value]) => typeof value === 'number')
    .map(([key]) => key)
    .sort();

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

  describe('swapCourtChangeConditions', () => {
    it('壁・おいかぜ・しんぴのまもり・しろいきり・設置技を、2 つの陣営で入れ替える', () => {
      // Arrange
      const state: SideState = {
        sides: {
          '1': { reflectTurns: 3, safeguardTurns: 2, spikesLayers: 2 },
          '2': { tailwindTurns: 4, mistTurns: 5, stealthRock: true, stickyWeb: true },
        },
      };

      // Act
      const swapped = swapCourtChangeConditions(state, 1, 2);

      // Assert
      expect(swapped).toEqual({
        sides: {
          '1': { tailwindTurns: 4, mistTurns: 5, stealthRock: true, stickyWeb: true },
          '2': { reflectTurns: 3, safeguardTurns: 2, spikesLayers: 2 },
        },
      });
    });

    it('ねがいごと・いやしのねがい・ガード系・選択待ちは、元の陣営に残す', () => {
      // Arrange
      const state: SideState = {
        sides: {
          '1': {
            lightScreenTurns: 5,
            wish: { turns: 1, healAmount: 80 },
            healingWish: 'healingWish',
          },
          '2': {
            toxicSpikesLayers: 1,
            wideGuard: true,
            quickGuard: true,
            craftyShield: true,
            matBlock: true,
            pendingChoice: { reason: 'pivot' },
          },
        },
      };

      // Act
      const swapped = swapCourtChangeConditions(state, 1, 2);

      // Assert
      expect(swapped).toEqual({
        sides: {
          '1': {
            wish: { turns: 1, healAmount: 80 },
            healingWish: 'healingWish',
            toxicSpikesLayers: 1,
          },
          '2': {
            wideGuard: true,
            quickGuard: true,
            craftyShield: true,
            matBlock: true,
            pendingChoice: { reason: 'pivot' },
            lightScreenTurns: 5,
          },
        },
      });
    });

    it('片方の陣営が空なら、もう片方の入れ替える状態がすべて移り、空になった陣営は消える', () => {
      // Arrange
      const state: SideState = {
        sides: { '1': { auroraVeilTurns: 5, luckyChantTurns: 3 } },
        global: { gravityTurns: 2 },
      };

      // Act
      const swapped = swapCourtChangeConditions(state, 1, 2);

      // Assert
      expect(swapped).toEqual({
        sides: { '2': { auroraVeilTurns: 5, luckyChantTurns: 3 } },
        global: { gravityTurns: 2 },
      });
    });

    it('元の状態は書き換えない', () => {
      // Arrange
      const state: SideState = { sides: { '1': { reflectTurns: 3 } } };

      // Act
      swapCourtChangeConditions(state, 1, 2);

      // Assert
      expect(state).toEqual({ sides: { '1': { reflectTurns: 3 } } });
    });
  });

  describe('tickSideStateAtTurnEnd', () => {
    it('両陣営の残りターン数を 1 減らし、1 のキーは消す', () => {
      // Arrange
      const state: SideState = {
        sides: {
          '1': { reflectTurns: 5, tailwindTurns: 1 },
          '2': { safeguardTurns: 2, mistTurns: 1, luckyChantTurns: 3 },
        },
      };

      // Act
      const ticked = tickSideStateAtTurnEnd(state);

      // Assert
      expect(ticked).toEqual({
        sides: { '1': { reflectTurns: 4 }, '2': { safeguardTurns: 1, luckyChantTurns: 2 } },
      });
    });

    it('ねがいごとは回復量を残してターン数だけ減らし、1 なら消す', () => {
      // Arrange
      const state: SideState = {
        sides: {
          '1': { wish: { turns: 2, healAmount: 80 } },
          '2': { wish: { turns: 1, healAmount: 50 } },
        },
      };

      // Act
      const ticked = tickSideStateAtTurnEnd(state);

      // Assert
      expect(ticked).toEqual({ sides: { '1': { wish: { turns: 1, healAmount: 80 } } } });
    });

    it('みらいよちは技と使用者を残してターン数だけ減らし、1 なら消す', () => {
      // Arrange
      const state: SideState = {
        sides: {
          '1': { futureAttack: { turns: 3, moveId: 248, sourceStatusId: 4 } },
          '2': { futureAttack: { turns: 1, moveId: 353, sourceStatusId: 3 } },
        },
      };

      // Act
      const ticked = tickSideStateAtTurnEnd(state);

      // Assert
      expect(ticked).toEqual({
        sides: { '1': { futureAttack: { turns: 2, moveId: 248, sourceStatusId: 4 } } },
      });
    });

    it('このターンだけ陣営を守るフラグは消し、空になった陣営はキーごと消す', () => {
      // Arrange
      const state: SideState = {
        sides: {
          '1': { wideGuard: true, quickGuard: true, craftyShield: true, matBlock: true },
          '2': { wideGuard: true, stealthRock: true },
        },
      };

      // Act
      const ticked = tickSideStateAtTurnEnd(state);

      // Assert
      expect(ticked).toEqual({ sides: { '2': { stealthRock: true } } });
    });

    it('両陣営にかかる状態の残りターン数を減らし、プラズマシャワーは消す', () => {
      // Arrange
      const state: SideState = {
        global: {
          weatherTurns: 3,
          weatherSourceStatusId: 4,
          trickRoomTurns: 1,
          terrainTurns: 5,
          ionDeluge: true,
          lastMoveId: 85,
        },
      };

      // Act
      const ticked = tickSideStateAtTurnEnd(state);

      // Assert
      expect(ticked).toEqual({
        global: { weatherTurns: 2, weatherSourceStatusId: 4, terrainTurns: 4, lastMoveId: 85 },
      });
    });

    it('設置技・いやしのねがい・選択待ちは、そのまま残す', () => {
      // Arrange
      const state: SideState = {
        sides: {
          '1': {
            spikesLayers: 2,
            toxicSpikesLayers: 1,
            stickyWeb: true,
            healingWish: 'lunarDance',
            pendingChoice: { reason: 'pivot' },
          },
        },
      };

      // Act
      const ticked = tickSideStateAtTurnEnd(state);

      // Assert
      expect(ticked).toEqual(state);
    });

    it('変える所がないときは、同じオブジェクトを返す', () => {
      // Arrange
      const state: SideState = { sides: { '1': { stealthRock: true } }, global: { lastMoveId: 3 } };

      // Act
      const ticked = tickSideStateAtTurnEnd(state);

      // Assert
      expect(ticked).toBe(state);
    });

    it('元の状態は書き換えない', () => {
      // Arrange
      const state: SideState = { sides: { '1': { reflectTurns: 5 } }, global: { gravityTurns: 1 } };

      // Act
      tickSideStateAtTurnEnd(state);

      // Assert
      expect(state).toEqual({ sides: { '1': { reflectTurns: 5 } }, global: { gravityTurns: 1 } });
    });

    it('〜Turns のキーは、すべてターン終了時に減らす', () => {
      // Arrange
      const sideTurnsKeys = Object.keys(FULL_SIDE_CONDITIONS).filter(key => key.endsWith('Turns'));
      const globalTurnsKeys = Object.keys(FULL_GLOBAL_FIELD_STATE).filter(key =>
        key.endsWith('Turns'),
      );

      // Act
      const sideCounterKeys: readonly string[] = SIDE_TURN_COUNTER_KEYS;
      const globalCounterKeys: readonly string[] = GLOBAL_TURN_COUNTER_KEYS;

      // Assert
      expect([...sideCounterKeys].sort()).toEqual(sideTurnsKeys.sort());
      expect([...globalCounterKeys].sort()).toEqual(globalTurnsKeys.sort());
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
    it('すべてのキーを持つ状態を読み込んで、そのまま返す', () => {
      // Arrange
      const json = {
        sides: { '1': FULL_SIDE_CONDITIONS, '2': { reflectTurns: 1 } },
        global: FULL_GLOBAL_FIELD_STATE,
      };

      // Act
      const state = parseSideState(json);

      // Assert
      expect(state).toEqual(json);
    });

    it('陣営の読み方の表のキーと SideConditions のキーが一致する', () => {
      // Act
      const parserKeys = Object.keys(SIDE_CONDITIONS_PARSERS).sort();

      // Assert
      expect(parserKeys).toEqual(Object.keys(FULL_SIDE_CONDITIONS).sort());
    });

    it('全体の読み方の表のキーと GlobalFieldState のキーが一致する', () => {
      // Act
      const parserKeys = Object.keys(GLOBAL_FIELD_STATE_PARSERS).sort();

      // Assert
      expect(parserKeys).toEqual(Object.keys(FULL_GLOBAL_FIELD_STATE).sort());
    });

    it('数値のキーはすべて範囲の表にある', () => {
      // Act
      const sideBoundKeys = SIDE_LOWER_BOUNDS.map(([key]) => key).sort();
      const globalBoundKeys = GLOBAL_LOWER_BOUNDS.map(([key]) => key).sort();

      // Assert
      expect(sideBoundKeys).toEqual(numberKeysOf(FULL_SIDE_CONDITIONS));
      expect(globalBoundKeys).toEqual(numberKeysOf(FULL_GLOBAL_FIELD_STATE));
    });

    it.each(SIDE_LOWER_BOUNDS)('陣営の %s は %p を読み込み、%p は捨てる', (key, min, belowMin) => {
      // Act
      const accepted = readSide({ [key]: min });
      const rejected = readSide({ [key]: belowMin });

      // Assert
      expect(accepted).toEqual({ [key]: min });
      expect(rejected).toEqual({});
    });

    it.each(SIDE_UPPER_BOUNDS)('陣営の %s は %p を読み込み、%p は捨てる', (key, max, aboveMax) => {
      // Act
      const accepted = readSide({ [key]: max });
      const rejected = readSide({ [key]: aboveMax });

      // Assert
      expect(accepted).toEqual({ [key]: max });
      expect(rejected).toEqual({});
    });

    it.each(GLOBAL_LOWER_BOUNDS)(
      '全体の %s は %p を読み込み、%p は捨てる',
      (key, min, belowMin) => {
        // Act
        const accepted = parseSideState({ global: { [key]: min } });
        const rejected = parseSideState({ global: { [key]: belowMin } });

        // Assert
        expect(accepted).toEqual({ global: { [key]: min } });
        expect(rejected).toEqual({});
      },
    );

    it.each([
      ['healingWish', 'healingWish'],
      ['healingWish', 'lunarDance'],
      ['pendingChoice', { reason: 'pivot' }],
      ['pendingChoice', { reason: 'batonPass' }],
      ['pendingChoice', { reason: 'shedTail' }],
      ['pendingChoice', { reason: 'emergencyExit' }],
    ])('陣営の %s は決められた値 %p を読み込む', (key, value) => {
      // Act
      const conditions = readSide({ [key]: value });

      // Assert
      expect(conditions).toEqual({ [key]: value });
    });

    it.each([
      ['healingWish', true],
      ['healingWish', 'wish'],
      ['pendingChoice', { reason: 'uTurn' }],
      ['pendingChoice', {}],
    ])('陣営の %s は決められていない値 %p を捨てる', (key, value) => {
      // Act
      const state = parseSideState({ sides: { '1': { [key]: value } } });

      // Assert
      expect(state).toEqual({});
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
