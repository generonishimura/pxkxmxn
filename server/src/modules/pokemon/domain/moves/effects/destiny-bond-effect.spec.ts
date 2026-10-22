import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { DestinyBondEffect } from './destiny-bond-effect';

describe('DestinyBondEffect（みちづれ）', () => {
  it('自分にみちづれ状態を書く', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle();
    const effect = new DestinyBondEffect();

    // Act
    const message = await effect.onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('is trying to take its foe down with it!');
    expect(get(1).volatileState.destinyBond).toBe(true);
    expect(get(2).volatileState.destinyBond).toBeUndefined();
  });

  it('前の行動でもみちづれを成功させていたら失敗する', () => {
    // Arrange
    const { context, get } = createInMemoryBattle({
      status: { volatileState: { consecutiveMoveCount: 1 } },
    });
    const effect = new DestinyBondEffect();

    // Act
    const failed = effect.shouldFail(get(1), get(2), context());

    // Assert
    expect(failed).toBe(true);
  });

  it('続けて使っていなければ失敗しない', () => {
    // Arrange
    const { context, get } = createInMemoryBattle();
    const effect = new DestinyBondEffect();

    // Act
    const failed = effect.shouldFail(get(1), get(2), context());

    // Assert
    expect(failed).toBe(false);
  });
});
