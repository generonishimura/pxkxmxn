import { findSwitchBlocker, switchBlockedMessage } from './switch-restriction';

describe('findSwitchBlocker（交代できない理由）', () => {
  it('何もなければ交代できる', () => {
    // Act
    const blocker = findSwitchBlocker({}, ['ノーマル']);

    // Assert
    expect(blocker).toBeUndefined();
  });

  it.each([
    [{ trappedByStatusId: 2 }, 'trapped'],
    [{ partialTrap: { sourceStatusId: 2, moveId: 1, turns: 3 } }, 'partialTrap'],
    [{ ingrain: true }, 'ingrain'],
  ] as const)('%j なら %s で交代できない', (state, expected) => {
    // Act
    const blocker = findSwitchBlocker(state, ['ノーマル']);

    // Assert
    expect(blocker).toBe(expected);
  });

  it('ゴーストタイプは、逃げられない状態・バインド状態でも交代できる', () => {
    // Act
    const blocker = findSwitchBlocker(
      { trappedByStatusId: 2, partialTrap: { sourceStatusId: 2, moveId: 1, turns: 3 } },
      ['ゴースト', 'どく'],
    );

    // Assert
    expect(blocker).toBeUndefined();
  });

  it('ゴーストタイプは、ねをはっていても交代できる（本家の ingrain は tryTrap で、ゴーストは trapped を受けない）', () => {
    // Act
    const blocker = findSwitchBlocker({ ingrain: true }, ['ゴースト']);

    // Assert
    expect(blocker).toBeUndefined();
  });

  it('交代できないときのメッセージを返す', () => {
    // Act & Assert
    expect(switchBlockedMessage('trapped')).toBe('Cannot switch out because it is trapped');
    expect(switchBlockedMessage('ingrain')).toBe('Cannot switch out because of its roots');
  });
});
