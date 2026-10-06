import {
  VOLATILE_MOVE_TURNS_COUNTER_KEYS,
  VOLATILE_STATE_PARSERS,
  VOLATILE_TURN_COUNTER_KEYS,
  VOLATILE_TURN_SCOPED_FLAGS,
  VOLATILE_UNTIL_NEXT_MOVE_FLAGS,
  VolatileState,
  BATON_PASS_KEYS,
  batonPassPatch,
  clearVolatileOnBeforeMove,
  clearVolatileOnSwitchOut,
  shedTailPatch,
  emptyVolatileState,
  parseVolatileState,
  releaseVolatileReferencesTo,
  tickVolatileStateAtTurnEnd,
  updateVolatileState,
} from './volatile-state';

/**
 * VolatileState のすべてのキーを 1 つずつ持つ状態
 * Required にしているので、VolatileState にキーを足すとここにも足さないとコンパイルが通らない
 */
const FULL_VOLATILE_STATE: Required<VolatileState> = {
  confusionTurns: 2,
  toxicCounter: 3,
  leechSeed: true,
  cursed: true,
  nightmare: true,
  ingrain: true,
  aquaRing: true,
  substituteHp: 51,
  tauntTurns: 3,
  encore: { moveId: 12, turns: 3 },
  disable: { moveId: 7, turns: 4 },
  torment: true,
  healBlockTurns: 5,
  imprison: true,
  choiceLockedMoveId: 33,
  lockedInMove: { moveId: 253, turns: 2 },
  chargingMoveId: 601,
  lastMoveId: 85,
  lastHitByMoveId: 94,
  moveSlotOverrides: [{ battlePokemonMoveId: 4, moveId: 102, currentPp: 5, maxPp: 5 }],
  protectCount: 1,
  protection: 'kingsShield',
  flinched: true,
  magicCoat: true,
  snatch: true,
  powder: true,
  electrified: true,
  roosting: true,
  destinyBond: true,
  grudge: true,
  lockOnTurns: 2,
  foresight: true,
  miracleEye: true,
  telekinesisTurns: 3,
  magnetRiseTurns: 5,
  tarShot: true,
  infatuatedWithStatusId: 2,
  trappedByStatusId: 2,
  octolock: true,
  yawnTurns: 2,
  perishCount: 3,
  stockpileCount: 3,
  stockpileBoosts: { defense: 2, specialDefense: 3 },
  critStageBoost: 2,
  laserFocusTurns: 2,
  charged: true,
  loafing: true,
  abilitySuppressed: true,
  abilityOverride: 'たんじゅん',
  typeOverride: [14],
  addedTypeId: 8,
  statOverrides: { attack: 120, defense: 80, specialAttack: 90, specialDefense: 70, speed: 110 },
  transformedIntoStatusId: 2,
  form: 'blade',
  illusionStatusId: 6,
  switchedInTurn: 4,
  typeChangeAbilityUsed: true,
  semiInvulnerable: 'air',
  mustRecharge: true,
  consecutiveMoveCount: 2,
  throatChopTurns: 2,
  partialTrap: { sourceStatusId: 2, moveId: 20, turns: 5 },
  saltCure: true,
  uproar: true,
  beakBlast: true,
};

/**
 * 数値のキーの下限。[キー, 読み込む最小の値, 捨てる値]
 */
const LOWER_BOUNDS: ReadonlyArray<readonly [keyof VolatileState, number, number]> = [
  ['confusionTurns', 0, -1],
  ['toxicCounter', 0, -1],
  ['substituteHp', 1, 0],
  ['tauntTurns', 0, -1],
  ['healBlockTurns', 0, -1],
  ['choiceLockedMoveId', 1, 0],
  ['chargingMoveId', 1, 0],
  ['lastMoveId', 1, 0],
  ['lastHitByMoveId', 1, 0],
  ['protectCount', 0, -1],
  ['lockOnTurns', 0, -1],
  ['telekinesisTurns', 0, -1],
  ['magnetRiseTurns', 0, -1],
  ['infatuatedWithStatusId', 1, 0],
  ['trappedByStatusId', 1, 0],
  ['yawnTurns', 0, -1],
  ['perishCount', 0, -1],
  ['stockpileCount', 1, 0],
  ['critStageBoost', 0, -1],
  ['laserFocusTurns', 0, -1],
  ['addedTypeId', 1, 0],
  ['transformedIntoStatusId', 1, 0],
  ['illusionStatusId', 1, 0],
  ['switchedInTurn', 0, -1],
  ['consecutiveMoveCount', 1, 0],
  ['throatChopTurns', 0, -1],
];

/**
 * 上限のある数値のキー。[キー, 読み込む最大の値, 捨てる値]
 */
const UPPER_BOUNDS: ReadonlyArray<readonly [keyof VolatileState, number, number]> = [
  ['perishCount', 3, 4],
  ['stockpileCount', 3, 4],
];

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
    it('すべてのキーを持つ状態を読み込んで、そのまま返す', () => {
      // Act
      const state = parseVolatileState(FULL_VOLATILE_STATE);

      // Assert
      expect(state).toEqual(FULL_VOLATILE_STATE);
    });

    it('読み方の表のキーと VolatileState のキーが一致する', () => {
      // Act
      const parserKeys = Object.keys(VOLATILE_STATE_PARSERS).sort();

      // Assert
      expect(parserKeys).toEqual(Object.keys(FULL_VOLATILE_STATE).sort());
    });

    it('数値のキーはすべて下限の表にある', () => {
      // Arrange
      const numberKeys = Object.entries(FULL_VOLATILE_STATE)
        .filter(([, value]) => typeof value === 'number')
        .map(([key]) => key)
        .sort();

      // Act
      const boundKeys = LOWER_BOUNDS.map(([key]) => key).sort();

      // Assert
      expect(boundKeys).toEqual(numberKeys);
    });

    it.each(LOWER_BOUNDS)('%s は %p を読み込み、%p は捨てる', (key, min, belowMin) => {
      // Act
      const accepted = parseVolatileState({ [key]: min });
      const rejected = parseVolatileState({ [key]: belowMin });

      // Assert
      expect(accepted).toEqual({ [key]: min });
      expect(rejected).toEqual({});
    });

    it.each(UPPER_BOUNDS)('%s は %p を読み込み、%p は捨てる', (key, max, aboveMax) => {
      // Act
      const accepted = parseVolatileState({ [key]: max });
      const rejected = parseVolatileState({ [key]: aboveMax });

      // Assert
      expect(accepted).toEqual({ [key]: max });
      expect(rejected).toEqual({});
    });

    it('一時的な技の欄は、1 つでも読めない要素があれば丸ごと捨てる', () => {
      // Arrange
      const json = {
        moveSlotOverrides: [
          { battlePokemonMoveId: 1, moveId: 102, currentPp: 0, maxPp: 5 },
          { battlePokemonMoveId: 2, moveId: 33, currentPp: 5, maxPp: 0 },
        ],
      };

      // Act
      const state = parseVolatileState(json);

      // Assert
      expect(state).toEqual({});
    });

    it('たくわえるで上がった量は 0〜6 だけを読み込む', () => {
      // Act
      const accepted = parseVolatileState({ stockpileBoosts: { defense: 0, specialDefense: 6 } });
      const rejected = parseVolatileState({ stockpileBoosts: { defense: 7, specialDefense: 1 } });

      // Assert
      expect(accepted).toEqual({ stockpileBoosts: { defense: 0, specialDefense: 6 } });
      expect(rejected).toEqual({});
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

  describe('clearVolatileOnSwitchOut', () => {
    it('交代で引っ込むときは、すべてのキーを消した状態を返す', () => {
      // Act
      const state = clearVolatileOnSwitchOut();

      // Assert
      expect(state).toEqual({});
    });
  });

  describe('tickVolatileStateAtTurnEnd', () => {
    it('残りターン数を 1 減らす', () => {
      // Arrange
      const state: VolatileState = { tauntTurns: 3, magnetRiseTurns: 5, yawnTurns: 2 };

      // Act
      const ticked = tickVolatileStateAtTurnEnd(state);

      // Assert
      expect(ticked).toEqual({ tauntTurns: 2, magnetRiseTurns: 4, yawnTurns: 1 });
    });

    it('残りターン数が 1 のキーは消す', () => {
      // Arrange
      const state: VolatileState = { healBlockTurns: 1, lockOnTurns: 1, laserFocusTurns: 2 };

      // Act
      const ticked = tickVolatileStateAtTurnEnd(state);

      // Assert
      expect(ticked).toEqual({ laserFocusTurns: 1 });
    });

    it('アンコール・かなしばりは技を残してターン数だけ減らし、1 なら消す', () => {
      // Arrange
      const state: VolatileState = {
        encore: { moveId: 12, turns: 3 },
        disable: { moveId: 7, turns: 1 },
      };

      // Act
      const ticked = tickVolatileStateAtTurnEnd(state);

      // Assert
      expect(ticked).toEqual({ encore: { moveId: 12, turns: 2 } });
    });

    it('このターンだけのフラグは消す', () => {
      // Arrange
      const state: VolatileState = {
        protection: 'protect',
        flinched: true,
        magicCoat: true,
        snatch: true,
        powder: true,
        electrified: true,
        roosting: true,
        beakBlast: true,
      };

      // Act
      const ticked = tickVolatileStateAtTurnEnd(state);

      // Assert
      expect(ticked).toEqual({});
    });

    it('さわぐが終わったあと（lockedInMove がない uproar）は、ターン終了時に uproar を消す', () => {
      // Arrange
      const state: VolatileState = { uproar: true };

      // Act
      const ticked = tickVolatileStateAtTurnEnd(state);

      // Assert
      expect(ticked).toEqual({});
    });

    it('さわいでいる途中（lockedInMove がある）なら、uproar は残す', () => {
      // Arrange
      const state: VolatileState = { uproar: true, lockedInMove: { moveId: 253, turns: 1 } };

      // Act
      const ticked = tickVolatileStateAtTurnEnd(state);

      // Assert
      expect(ticked).toEqual(state);
    });

    it('ターン終了時に減らさないキーは、そのまま残す', () => {
      // Arrange
      const state: VolatileState = {
        confusionTurns: 2,
        toxicCounter: 3,
        perishCount: 2,
        lockedInMove: { moveId: 253, turns: 2 },
        protectCount: 1,
        destinyBond: true,
        grudge: true,
        leechSeed: true,
        partialTrap: { sourceStatusId: 2, moveId: 20, turns: 5 },
        mustRecharge: true,
        semiInvulnerable: 'underground',
        consecutiveMoveCount: 2,
      };

      // Act
      const ticked = tickVolatileStateAtTurnEnd(state);

      // Assert
      expect(ticked).toEqual(state);
    });

    it('変える所がないときは、同じオブジェクトを返す', () => {
      // Arrange
      const state: VolatileState = { leechSeed: true };

      // Act
      const ticked = tickVolatileStateAtTurnEnd(state);

      // Assert
      expect(ticked).toBe(state);
    });

    it('元の状態は書き換えない', () => {
      // Arrange
      const state: VolatileState = { tauntTurns: 3, protection: 'protect' };

      // Act
      tickVolatileStateAtTurnEnd(state);

      // Assert
      expect(state).toEqual({ tauntTurns: 3, protection: 'protect' });
    });

    it('〜Turns のキーは、こんらん以外すべてターン終了時に減らす', () => {
      // Arrange
      const turnsKeys = Object.keys(FULL_VOLATILE_STATE).filter(key => key.endsWith('Turns'));

      // Act
      const notTicked = turnsKeys.filter(
        key => !(VOLATILE_TURN_COUNTER_KEYS as readonly string[]).includes(key),
      );

      // Assert
      expect(notTicked).toEqual(['confusionTurns']);
    });

    it('グループどうしでキーが重ならない', () => {
      // Arrange
      const groups: ReadonlyArray<readonly string[]> = [
        VOLATILE_TURN_COUNTER_KEYS,
        VOLATILE_MOVE_TURNS_COUNTER_KEYS,
        VOLATILE_TURN_SCOPED_FLAGS,
        VOLATILE_UNTIL_NEXT_MOVE_FLAGS,
      ];

      // Act
      const allKeys = groups.flat();

      // Assert
      expect(new Set(allKeys).size).toBe(allKeys.length);
    });
  });

  describe('clearVolatileOnBeforeMove', () => {
    it('みちづれとおんねんを消し、ほかのキーは残す', () => {
      // Arrange
      const state: VolatileState = { destinyBond: true, grudge: true, leechSeed: true };

      // Act
      const cleared = clearVolatileOnBeforeMove(state);

      // Assert
      expect(cleared).toEqual({ leechSeed: true });
    });

    it('消すキーがないときは、同じオブジェクトを返す', () => {
      // Arrange
      const state: VolatileState = { tauntTurns: 2 };

      // Act
      const cleared = clearVolatileOnBeforeMove(state);

      // Assert
      expect(cleared).toBe(state);
    });
  });

  describe('releaseVolatileReferencesTo', () => {
    it('場を離れたポケモンによる、逃げられない状態とたこがためを消す', () => {
      // Arrange
      const state: VolatileState = { trappedByStatusId: 5, octolock: true, leechSeed: true };

      // Act
      const released = releaseVolatileReferencesTo(state, 5);

      // Assert
      expect(released).toEqual({ leechSeed: true });
    });

    it('場を離れたポケモンへのメロメロを消す', () => {
      // Arrange
      const state: VolatileState = { infatuatedWithStatusId: 5 };

      // Act
      const released = releaseVolatileReferencesTo(state, 5);

      // Assert
      expect(released).toEqual({});
    });

    it('場を離れたポケモンによるしめつける系の状態を消す', () => {
      // Arrange
      const state: VolatileState = { partialTrap: { sourceStatusId: 5, moveId: 20, turns: 4 } };

      // Act
      const released = releaseVolatileReferencesTo(state, 5);

      // Assert
      expect(released).toEqual({});
    });

    it('ほかのポケモンを指しているときは、同じオブジェクトを返す', () => {
      // Arrange
      const state: VolatileState = {
        trappedByStatusId: 6,
        octolock: true,
        infatuatedWithStatusId: 6,
      };

      // Act
      const released = releaseVolatileReferencesTo(state, 5);

      // Assert
      expect(released).toBe(state);
    });
  });

  describe('batonPassPatch', () => {
    it('バトンタッチで引き継ぐキーだけを取り出す', () => {
      // Arrange
      const state: VolatileState = {
        substituteHp: 30,
        confusionTurns: 2,
        leechSeed: true,
        perishCount: 2,
        critStageBoost: 2,
        tauntTurns: 2,
        encore: { moveId: 3, turns: 2 },
        infatuatedWithStatusId: 4,
        lastMoveId: 5,
        switchedInTurn: 1,
      };

      // Act
      const patch = batonPassPatch(state);

      // Assert
      expect(patch).toEqual({
        substituteHp: 30,
        confusionTurns: 2,
        leechSeed: true,
        perishCount: 2,
        critStageBoost: 2,
        tauntTurns: 2,
      });
    });

    it('引き継ぐキーはすべて VolatileState のキー', () => {
      // Act
      const unknownKeys = BATON_PASS_KEYS.filter(key => !(key in FULL_VOLATILE_STATE));

      // Assert
      expect(unknownKeys).toEqual([]);
    });
  });

  describe('shedTailPatch', () => {
    it('しっぽきりはみがわりだけを引き継ぐ', () => {
      // Arrange
      const state: VolatileState = { substituteHp: 25, leechSeed: true };

      // Act
      const patch = shedTailPatch(state);

      // Assert
      expect(patch).toEqual({ substituteHp: 25 });
    });

    it('みがわりがなければ空の patch を返す', () => {
      // Act
      const patch = shedTailPatch({ leechSeed: true });

      // Assert
      expect(patch).toEqual({});
    });
  });
});
