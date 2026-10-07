import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';
import { BaseTrapMoveEffect } from './base-trap-move-effect';

/**
 * テスト用の具象クラス
 */
class TestTrapMoveEffect extends BaseTrapMoveEffect {}

describe('BaseTrapMoveEffect（逃げられなくする変化技）', () => {
  it('相手に使用者を指す trappedByStatusId を書く', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle();

    // Act
    const message = await new TestTrapMoveEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('The target can no longer escape!');
    expect(get(2).volatileState.trappedByStatusId).toBe(1);
  });

  it('相手がすでに逃げられない状態なら失敗し、かけたポケモンは変わらない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      {},
      { status: { volatileState: { trappedByStatusId: 3 } } },
    );

    // Act
    const message = await new TestTrapMoveEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('But it failed');
    expect(get(2).volatileState.trappedByStatusId).toBe(3);
  });

  it('相手がゴーストタイプなら失敗する', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({}, { types: ['ゴースト', 'どく'] });

    // Act
    const message = await new TestTrapMoveEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('But it failed');
    expect(get(2).volatileState.trappedByStatusId).toBeUndefined();
  });

  it('相手がひんしなら失敗する', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({}, { status: { currentHp: 0 } });

    // Act
    const message = await new TestTrapMoveEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('But it failed');
    expect(get(2).volatileState.trappedByStatusId).toBeUndefined();
  });
});
