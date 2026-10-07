import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { ElectrifyEffect } from './electrify-effect';

describe('ElectrifyEffect（そうでん）', () => {
  it('相手がこのターンにまだ行動していなければ、相手に electrified を書く', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle();

    // Act
    const message = await new ElectrifyEffect().onUse(
      get(1),
      get(2),
      context({ defenderPendingMoveId: 33 }),
    );

    // Assert
    expect(message).toBe('moves have been electrified!');
    expect(get(2).volatileState.electrified).toBe(true);
  });

  it('相手がこのターンにもう行動していれば失敗する', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle();

    // Act
    const message = await new ElectrifyEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('But it failed');
    expect(get(2).volatileState.electrified).toBeUndefined();
  });

  it('相手がこのターンに交代で出たなら、成功する（本家の activeTurns が 0）', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      {},
      { status: { volatileState: { switchedInTurn: 1 } } },
    );

    // Act
    const message = await new ElectrifyEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('moves have been electrified!');
    expect(get(2).volatileState.electrified).toBe(true);
  });

  it('前のターンに交代で出て、このターンにもう行動した相手には失敗する', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      {},
      { status: { volatileState: { switchedInTurn: 0 } } },
    );

    // Act
    const message = await new ElectrifyEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('But it failed');
    expect(get(2).volatileState.electrified).toBeUndefined();
  });
});
