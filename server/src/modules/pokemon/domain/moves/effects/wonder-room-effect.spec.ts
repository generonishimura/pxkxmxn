import { getGlobalFieldState } from '@/modules/battle/domain/state/side-state';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { WonderRoomEffect } from './wonder-room-effect';

describe('WonderRoomEffect（ワンダールーム）', () => {
  it('ワンダールームを 5 ターン張る', async () => {
    // Arrange
    const { context, get, battleRepository } = createInMemoryBattle();

    // Act
    const message = await new WonderRoomEffect().onUse(get(1), get(2), context());

    // Assert
    const battle = (await battleRepository.findById(1))!;
    expect(getGlobalFieldState(battle.sideState).wonderRoomTurns).toBe(5);
    expect(message).toBe(
      'It created a bizarre area in which Defense and Sp. Def stats are swapped!',
    );
  });

  it('ワンダールームの間に使うと、ワンダールームを終わらせる', async () => {
    // Arrange
    const { context, get, battleRepository } = createInMemoryBattle();
    await battleRepository.patchGlobalFieldState(1, { wonderRoomTurns: 4, trickRoomTurns: 2 });

    // Act
    const message = await new WonderRoomEffect().onUse(get(1), get(2), context());

    // Assert
    const battle = (await battleRepository.findById(1))!;
    expect(getGlobalFieldState(battle.sideState)).toEqual({ trickRoomTurns: 2 });
    expect(message).toBe('Wonder Room wore off, and Defense and Sp. Def stats returned to normal!');
  });
});
