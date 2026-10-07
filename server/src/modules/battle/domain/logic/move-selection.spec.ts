import { BattlePokemonMove } from '../entities/battle-pokemon-move.entity';
import { VolatileState } from '../state/volatile-state';
import {
  MoveCandidate,
  findMoveRestriction,
  findMoveSlot,
  moveRestrictionMessage,
  resolveForcedAction,
  resolveMoveSlots,
} from './move-selection';

const candidate = (overrides: Partial<MoveCandidate> = {}): MoveCandidate => ({
  moveId: 10,
  moveName: 'かえんほうしゃ',
  category: 'Special',
  ...overrides,
});

describe('move-selection', () => {
  describe('findMoveRestriction', () => {
    it('何の状態もなければ制限しない', () => {
      // Act
      const reason = findMoveRestriction({}, candidate());

      // Assert
      expect(reason).toBeUndefined();
    });

    it('じゅうりょくの間は、そらをとぶなど gravity の技を出せない', () => {
      // Act
      const reason = findMoveRestriction({}, candidate({ moveName: 'そらをとぶ' }), {
        gravity: true,
      });

      // Assert
      expect(reason).toBe('gravity');
    });

    it('じゅうりょくの間でも、gravity でない技は出せる', () => {
      // Act
      const reason = findMoveRestriction({}, candidate(), { gravity: true });

      // Assert
      expect(reason).toBeUndefined();
    });

    it('じゅうりょくで出せないときのメッセージ', () => {
      // Act
      const message = moveRestrictionMessage('gravity', 'とびげり');

      // Assert
      expect(message).toBe('Cannot use とびげり because of gravity');
    });

    it('ちょうはつ中は変化技を出せない', () => {
      // Act
      const reason = findMoveRestriction(
        { tauntTurns: 2 },
        candidate({ category: 'Status', moveName: 'つるぎのまい' }),
      );

      // Assert
      expect(reason).toBe('taunt');
    });

    it('ちょうはつ中でも攻撃技は出せる', () => {
      // Act
      const reason = findMoveRestriction({ tauntTurns: 2 }, candidate());

      // Assert
      expect(reason).toBeUndefined();
    });

    it('かなしばりされた技は出せない', () => {
      // Act
      const reason = findMoveRestriction({ disable: { moveId: 10, turns: 3 } }, candidate());

      // Assert
      expect(reason).toBe('disable');
    });

    it('アンコール中は、アンコールされた技以外を出せない', () => {
      // Act
      const reason = findMoveRestriction({ encore: { moveId: 99, turns: 3 } }, candidate());

      // Assert
      expect(reason).toBe('encore');
    });

    it('いちゃもん中は、直前に出した技を続けて出せない', () => {
      // Act
      const reason = findMoveRestriction({ torment: true, lastMoveId: 10 }, candidate());

      // Assert
      expect(reason).toBe('torment');
    });

    it('かいふくふうじ中は回復技を出せない', () => {
      // Act
      const reason = findMoveRestriction(
        { healBlockTurns: 3 },
        candidate({ moveName: 'じこさいせい', category: 'Status' }),
      );

      // Assert
      expect(reason).toBe('healBlock');
    });

    it('じごくづき中は音技を出せない', () => {
      // Act
      const reason = findMoveRestriction(
        { throatChopTurns: 2 },
        candidate({ moveName: 'ハイパーボイス' }),
      );

      // Assert
      expect(reason).toBe('throatChop');
    });

    it('こだわっている技以外は出せない', () => {
      // Act
      const reason = findMoveRestriction({ choiceLockedMoveId: 99 }, candidate());

      // Assert
      expect(reason).toBe('choiceLock');
    });

    it('相手がふういんした技は出せない', () => {
      // Act
      const reason = findMoveRestriction({}, candidate(), { imprisonedMoveIds: [10] });

      // Assert
      expect(reason).toBe('imprison');
    });

    it('デカハンマーは続けて出せない', () => {
      // Act
      const reason = findMoveRestriction(
        { lastMoveId: 10 },
        candidate({ moveName: 'デカハンマー', category: 'Physical' }),
      );

      // Assert
      expect(reason).toBe('cantUseTwice');
    });

    it('わるあがきはどの状態でも出せる', () => {
      // Arrange
      const state: VolatileState = {
        tauntTurns: 2,
        disable: { moveId: 165, turns: 2 },
        torment: true,
        lastMoveId: 165,
        choiceLockedMoveId: 1,
      };

      // Act
      const reason = findMoveRestriction(
        state,
        candidate({ moveId: 165, moveName: 'わるあがき', category: 'Physical' }),
      );

      // Assert
      expect(reason).toBeUndefined();
    });

    it('かなしばりはちょうはつより先に判定する（本家の順）', () => {
      // Act
      const reason = findMoveRestriction(
        { tauntTurns: 2, disable: { moveId: 10, turns: 2 } },
        candidate({ category: 'Status' }),
      );

      // Assert
      expect(reason).toBe('disable');
    });

    describe('技を出すとき（phase: execute）', () => {
      it('いちゃもんは技を選ぶときだけ効くので、技を出すときは止めない', () => {
        // Act
        const reason = findMoveRestriction({ torment: true, lastMoveId: 10 }, candidate(), {
          phase: 'execute',
        });

        // Assert
        expect(reason).toBeUndefined();
      });

      it('続けて出せない技も、技を出すときは止めない', () => {
        // Act
        const reason = findMoveRestriction(
          { lastMoveId: 10 },
          candidate({ moveName: 'デカハンマー', category: 'Physical' }),
          { phase: 'execute' },
        );

        // Assert
        expect(reason).toBeUndefined();
      });

      it('アンコールは技を出すときには止めない（エンジンがアンコールされた技に変える）', () => {
        // Act
        const reason = findMoveRestriction({ encore: { moveId: 99, turns: 3 } }, candidate(), {
          phase: 'execute',
        });

        // Assert
        expect(reason).toBeUndefined();
      });

      it('かなしばり・ちょうはつ・こだわりは、技を出すときも止める', () => {
        // Act
        const reasons = [
          findMoveRestriction({ disable: { moveId: 10, turns: 2 } }, candidate(), {
            phase: 'execute',
          }),
          findMoveRestriction({ tauntTurns: 2 }, candidate({ category: 'Status' }), {
            phase: 'execute',
          }),
          findMoveRestriction({ choiceLockedMoveId: 1 }, candidate(), { phase: 'execute' }),
        ];

        // Assert
        expect(reasons).toEqual(['disable', 'taunt', 'choiceLock']);
      });
    });
  });

  describe('moveRestrictionMessage', () => {
    it('理由と技名からメッセージを作る', () => {
      // Act
      const message = moveRestrictionMessage('taunt', 'つるぎのまい');

      // Assert
      expect(message).toBe('Cannot use つるぎのまい after the taunt');
    });
  });

  describe('resolveForcedAction', () => {
    it('反動で動けないときは recharge', () => {
      // Act
      const forced = resolveForcedAction({ mustRecharge: true, lastMoveId: 63 });

      // Assert
      expect(forced).toEqual({ kind: 'recharge', moveId: 63 });
    });

    it('ため技をためているときは、その技を出す', () => {
      // Act
      const forced = resolveForcedAction({ chargingMoveId: 76 });

      // Assert
      expect(forced).toEqual({ kind: 'charging', moveId: 76 });
    });

    it('あばれる系で出し続けるときは、その技を出す', () => {
      // Act
      const forced = resolveForcedAction({ lockedInMove: { moveId: 200, turns: 1 } });

      // Assert
      expect(forced).toEqual({ kind: 'lockedIn', moveId: 200 });
    });

    it('アンコール中は、アンコールされた技を出す', () => {
      // Act
      const forced = resolveForcedAction({ encore: { moveId: 14, turns: 2 } });

      // Assert
      expect(forced).toEqual({ kind: 'encore', moveId: 14 });
    });

    it('反動・ため・出し続け・アンコールの順に優先する', () => {
      // Act
      const forced = resolveForcedAction({
        mustRecharge: true,
        chargingMoveId: 76,
        lockedInMove: { moveId: 200, turns: 1 },
        encore: { moveId: 14, turns: 2 },
      });

      // Assert
      expect(forced?.kind).toBe('recharge');
    });

    it('どれもなければ undefined', () => {
      // Act
      const forced = resolveForcedAction({ tauntTurns: 2 });

      // Assert
      expect(forced).toBeUndefined();
    });
  });

  describe('resolveMoveSlots', () => {
    const moves = [new BattlePokemonMove(1, 5, 10, 8, 15), new BattlePokemonMove(2, 5, 20, 5, 5)];

    it('入れ替わった技がなければ、覚えている技をそのまま返す', () => {
      // Act
      const slots = resolveMoveSlots(moves, {});

      // Assert
      expect(slots).toEqual([
        { battlePokemonMoveId: 1, moveId: 10, currentPp: 8, maxPp: 15, isOverride: false },
        { battlePokemonMoveId: 2, moveId: 20, currentPp: 5, maxPp: 5, isOverride: false },
      ]);
    });

    it('ものまねで入れ替わった欄は、代わりの技と PP を返す', () => {
      // Act
      const slots = resolveMoveSlots(moves, {
        moveSlotOverrides: [{ battlePokemonMoveId: 2, moveId: 99, currentPp: 5, maxPp: 5 }],
      });

      // Assert
      expect(slots[1]).toEqual({
        battlePokemonMoveId: 2,
        moveId: 99,
        currentPp: 5,
        maxPp: 5,
        isOverride: true,
      });
    });

    it('技 ID から欄を探す（入れ替わる前の技は見つからない）', () => {
      // Arrange
      const slots = resolveMoveSlots(moves, {
        moveSlotOverrides: [{ battlePokemonMoveId: 2, moveId: 99, currentPp: 5, maxPp: 5 }],
      });

      // Act
      const found = findMoveSlot(slots, 99);
      const replaced = findMoveSlot(slots, 20);

      // Assert
      expect(found?.battlePokemonMoveId).toBe(2);
      expect(replaced).toBeUndefined();
    });

    it('へんしん中は、覚えている技ではなく moveSlotOverrides の欄だけを返す（欄の数は写した相手と同じ）', () => {
      // Act
      const slots = resolveMoveSlots(moves, {
        transformedIntoStatusId: 7,
        moveSlotOverrides: [
          { battlePokemonMoveId: 71, moveId: 30, currentPp: 5, maxPp: 5 },
          { battlePokemonMoveId: 72, moveId: 31, currentPp: 5, maxPp: 5 },
          { battlePokemonMoveId: 73, moveId: 32, currentPp: 1, maxPp: 1 },
        ],
      });

      // Assert
      expect(slots.map(slot => [slot.battlePokemonMoveId, slot.moveId, slot.isOverride])).toEqual([
        [71, 30, true],
        [72, 31, true],
        [73, 32, true],
      ]);
    });

    it('へんしん中に同じ欄を入れ替えたら（ものまね）、後ろの入れ替えを使う', () => {
      // Act
      const slots = resolveMoveSlots(moves, {
        transformedIntoStatusId: 7,
        moveSlotOverrides: [
          { battlePokemonMoveId: 71, moveId: 30, currentPp: 5, maxPp: 5 },
          { battlePokemonMoveId: 71, moveId: 99, currentPp: 5, maxPp: 5 },
        ],
      });

      // Assert
      expect(slots).toEqual([
        { battlePokemonMoveId: 71, moveId: 99, currentPp: 5, maxPp: 5, isOverride: true },
      ]);
    });
  });
});
