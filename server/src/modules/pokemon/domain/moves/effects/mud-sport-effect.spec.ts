import { getGlobalFieldState } from '@/modules/battle/domain/state/side-state';
import { AbilityRegistry } from '../../abilities/ability-registry';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { MudSportEffect } from './mud-sport-effect';

describe('MudSportEffect（どろあそび）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('両陣営にかかる残り 5 ターンのどろあそびを張る', async () => {
    // Arrange
    const { context, get, battleRepository } = createInMemoryBattle();

    // Act
    const message = await new MudSportEffect().onUse(get(1), get(2), context());

    // Assert
    const battle = (await battleRepository.findById(1))!;
    expect(getGlobalFieldState(battle.sideState)).toEqual({ mudSportTurns: 5 });
    expect(message).toBe("Electricity's power was weakened!");
  });

  it('すでにどろあそびの状態なら失敗し、残りターン数は変わらない', async () => {
    // Arrange
    const { context, get, battleRepository } = createInMemoryBattle();
    await battleRepository.patchGlobalFieldState(1, { mudSportTurns: 2 });

    // Act
    const message = await new MudSportEffect().onUse(get(1), get(2), context());

    // Assert
    const battle = (await battleRepository.findById(1))!;
    expect(getGlobalFieldState(battle.sideState)).toEqual({ mudSportTurns: 2 });
    expect(message).toBe('But it failed');
  });

  it('ほかの場の状態は残したまま張る', async () => {
    // Arrange
    const { context, get, battleRepository } = createInMemoryBattle();
    await battleRepository.patchGlobalFieldState(1, { waterSportTurns: 3, trickRoomTurns: 4 });

    // Act
    await new MudSportEffect().onUse(get(1), get(2), context());

    // Assert
    const battle = (await battleRepository.findById(1))!;
    expect(getGlobalFieldState(battle.sideState)).toEqual({
      waterSportTurns: 3,
      trickRoomTurns: 4,
      mudSportTurns: 5,
    });
  });
});
