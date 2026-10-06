import { createInMemoryBattle } from './in-memory-battle';

describe('createInMemoryBattle', () => {
  it('update で書いた sideState を findById で読み直せる', async () => {
    // Arrange
    const { battleRepository } = createInMemoryBattle();

    // Act
    await battleRepository.update(1, { sideState: { sides: { '1': { reflectTurns: 5 } } } });
    const battle = await battleRepository.findById(1);

    // Assert
    expect(battle.sideState).toEqual({ sides: { '1': { reflectTurns: 5 } } });
  });

  it('update は渡さなかった欄を残す', async () => {
    // Arrange
    const { battleRepository } = createInMemoryBattle();

    // Act
    const updated = await battleRepository.update(1, { turn: 3 });

    // Assert
    expect(updated.turn).toBe(3);
    expect(updated.trainer2Id).toBe(2);
  });

  it('patchSideConditions は、先に書いたほかの陣営とキーを残す', async () => {
    // Arrange
    const { battleRepository } = createInMemoryBattle();
    await battleRepository.patchSideConditions(1, 1, { tailwindTurns: 4 });

    // Act
    await battleRepository.patchSideConditions(1, 2, { stealthRock: true });
    const battle = await battleRepository.findById(1);

    // Assert
    expect(battle.sideState).toEqual({
      sides: { '1': { tailwindTurns: 4 }, '2': { stealthRock: true } },
    });
  });

  it('patchGlobalFieldState は両陣営にかかる状態を書く', async () => {
    // Arrange
    const { battleRepository } = createInMemoryBattle();

    // Act
    const battle = await battleRepository.patchGlobalFieldState(1, { trickRoomTurns: 5 });

    // Assert
    expect(battle.sideState).toEqual({ global: { trickRoomTurns: 5 } });
  });

  it('context の battle は、最後に書いたバトルを返す', async () => {
    // Arrange
    const { battleRepository, context } = createInMemoryBattle();

    // Act
    await battleRepository.patchGlobalFieldState(1, { gravityTurns: 5 });

    // Assert
    expect(context().battle.sideState).toEqual({ global: { gravityTurns: 5 } });
  });

  it('patchVolatileState は、先に書いたキーを残す', async () => {
    // Arrange
    const { battleRepository, get } = createInMemoryBattle();
    await battleRepository.patchVolatileState(2, { tauntTurns: 3 });

    // Act
    await battleRepository.patchVolatileState(2, { critStageBoost: 2 });

    // Assert
    expect(get(2).volatileState).toEqual({ tauntTurns: 3, critStageBoost: 2 });
  });
});
