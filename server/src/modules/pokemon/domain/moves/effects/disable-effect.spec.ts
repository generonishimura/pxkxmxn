import { BattlePokemonMove } from '@/modules/battle/domain/entities/battle-pokemon-move.entity';
import { Move, MoveCategory } from '../../entities/move.entity';
import { Type } from '../../entities/type.entity';
import { IMoveRepository } from '../../pokemon.repository.interface';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { DisableEffect } from './disable-effect';

describe('DisableEffect（かなしばり）', () => {
  const normal = new Type(1, 'ノーマル', 'Normal');
  const moves = new Map<number, Move>([
    [10, new Move(10, 'たいあたり', 'Tackle', normal, MoveCategory.Physical, 40, 100, 35, 0, null)],
    [
      99,
      new Move(99, 'わるあがき', 'Struggle', normal, MoveCategory.Physical, 50, null, 1, 0, null),
    ],
  ]);
  const moveRepository: IMoveRepository = {
    findById: jest.fn((id: number) => Promise.resolve(moves.get(id) ?? null)),
    findByPokemonId: jest.fn(),
  };

  const setup = (
    lastMoveId: number | undefined,
    currentPp = 10,
    disable?: { moveId: number; turns: number },
  ) => {
    const battle = createInMemoryBattle(
      {},
      { status: { volatileState: { ...(lastMoveId ? { lastMoveId } : {}), disable } } },
    );
    battle.battleRepository.findBattlePokemonMovesByBattlePokemonStatusId.mockResolvedValue([
      new BattlePokemonMove(1, 2, 10, currentPp, 35),
    ]);
    return battle;
  };

  it('相手がまだ行動していなければ、相手が最後に使った技を 4 ターンかなしばりにする', async () => {
    // Arrange
    const { context, get } = setup(10);
    const effect = new DisableEffect();

    // Act
    const message = await effect.onUse(
      get(1),
      get(2),
      context({ moveRepository, defenderPendingMoveId: 10 }),
    );

    // Assert
    expect(message).toBe('disabled たいあたり!');
    expect(get(2).volatileState.disable).toEqual({ moveId: 10, turns: 4 });
  });

  it('相手がもう行動していれば 5 ターンかなしばりにする', async () => {
    // Arrange
    const { context, get } = setup(10);
    const effect = new DisableEffect();

    // Act
    await effect.onUse(get(1), get(2), context({ moveRepository }));

    // Assert
    expect(get(2).volatileState.disable).toEqual({ moveId: 10, turns: 5 });
  });

  it('相手がまだ技を使っていなければ失敗する', async () => {
    // Arrange
    const { context, get, battleRepository } = setup(undefined);
    const effect = new DisableEffect();

    // Act
    const message = await effect.onUse(get(1), get(2), context({ moveRepository }));

    // Assert
    expect(message).toBe('But it failed');
    expect(battleRepository.patchVolatileState).not.toHaveBeenCalled();
  });

  it('相手が最後に使った技の PP が 0 なら失敗する', async () => {
    // Arrange
    const { context, get, battleRepository } = setup(10, 0);
    const effect = new DisableEffect();

    // Act
    const message = await effect.onUse(get(1), get(2), context({ moveRepository }));

    // Assert
    expect(message).toBe('But it failed');
    expect(battleRepository.patchVolatileState).not.toHaveBeenCalled();
  });

  it('相手が最後に使った技がわるあがきなら失敗する', async () => {
    // Arrange
    const { context, get, battleRepository } = setup(99);
    const effect = new DisableEffect();

    // Act
    const message = await effect.onUse(get(1), get(2), context({ moveRepository }));

    // Assert
    expect(message).toBe('But it failed');
    expect(battleRepository.patchVolatileState).not.toHaveBeenCalled();
  });

  it('すでにかなしばり状態の相手には失敗する', async () => {
    // Arrange
    const { context, get } = setup(10, 10, { moveId: 10, turns: 2 });
    const effect = new DisableEffect();

    // Act
    const message = await effect.onUse(get(1), get(2), context({ moveRepository }));

    // Assert
    expect(message).toBe('But it failed');
    expect(get(2).volatileState.disable).toEqual({ moveId: 10, turns: 2 });
  });
});
