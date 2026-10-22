import { getGlobalFieldState } from '@/modules/battle/domain/state/side-state';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { TrickRoomEffect } from './trick-room-effect';

describe('TrickRoomEffect（トリックルーム）', () => {
  it('トリックルームを 5 ターン張る', async () => {
    // Arrange
    const { context, get, battleRepository } = createInMemoryBattle();

    // Act
    const message = await new TrickRoomEffect().onUse(get(1), get(2), context());

    // Assert
    const battle = (await battleRepository.findById(1))!;
    expect(getGlobalFieldState(battle.sideState).trickRoomTurns).toBe(5);
    expect(message).toBe('The dimensions were twisted!');
  });

  it('トリックルームの間に使うと、トリックルームを終わらせる', async () => {
    // Arrange
    const { context, get, battleRepository } = createInMemoryBattle();
    await battleRepository.patchGlobalFieldState(1, { trickRoomTurns: 3 });

    // Act
    const message = await new TrickRoomEffect().onUse(get(1), get(2), context());

    // Assert
    const battle = (await battleRepository.findById(1))!;
    expect(getGlobalFieldState(battle.sideState).trickRoomTurns).toBeUndefined();
    expect(message).toBe('The twisted dimensions returned to normal!');
  });

  it('ほかの場の状態は残す', async () => {
    // Arrange
    const { context, get, battleRepository } = createInMemoryBattle();
    await battleRepository.patchGlobalFieldState(1, { wonderRoomTurns: 2 });

    // Act
    await new TrickRoomEffect().onUse(get(1), get(2), context());

    // Assert
    const battle = (await battleRepository.findById(1))!;
    expect(getGlobalFieldState(battle.sideState)).toEqual({
      wonderRoomTurns: 2,
      trickRoomTurns: 5,
    });
  });
});
