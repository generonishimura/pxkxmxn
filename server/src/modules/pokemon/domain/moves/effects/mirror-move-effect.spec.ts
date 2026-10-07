import { MirrorMoveEffect } from './mirror-move-effect';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { Move, MoveCategory } from '../../entities/move.entity';
import { Type } from '../../entities/type.entity';
import { IMoveRepository } from '../../pokemon.repository.interface';
import { CallMove } from '../../battle-events/called-move';

const NORMAL = new Type(1, 'ノーマル', 'Normal');
const FIRE = new Type(2, 'ほのお', 'Fire');
const FLAMETHROWER = new Move(
  20,
  'かえんほうしゃ',
  'Flamethrower',
  FIRE,
  MoveCategory.Special,
  90,
  100,
  15,
  0,
  null,
);
const SWORDS_DANCE = new Move(
  30,
  'つるぎのまい',
  'Swords Dance',
  NORMAL,
  MoveCategory.Status,
  null,
  null,
  20,
  0,
  null,
);

const createMoveRepository = (): jest.Mocked<IMoveRepository> => {
  const moves = new Map([FLAMETHROWER, SWORDS_DANCE].map(move => [move.id, move]));
  return {
    findById: jest.fn((id: number) => Promise.resolve(moves.get(id) ?? null)),
    findByPokemonId: jest.fn(),
  };
};

/**
 * 相手（ID 2）が lastMoveId の技を最後に使った
 */
const setup = (defenderLastMoveId: number | undefined) => {
  const battle = createInMemoryBattle(
    {},
    { status: { volatileState: { lastMoveId: defenderLastMoveId } } },
  );
  const callMove: jest.MockedFunction<CallMove> = jest
    .fn()
    .mockResolvedValue('Used かえんほうしゃ and dealt 40 damage');
  const context = () => battle.context({ callMove, moveRepository: createMoveRepository() });
  return { ...battle, callMove, context };
};

describe('MirrorMoveEffect（オウムがえし）', () => {
  it('相手が最後に使った技（mirror）を、相手に向けて出す', async () => {
    // Arrange
    const { get, callMove, context } = setup(FLAMETHROWER.id);

    // Act
    const message = await new MirrorMoveEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('Used かえんほうしゃ and dealt 40 damage');
    expect(callMove).toHaveBeenCalledWith({
      moveId: FLAMETHROWER.id,
      calledBy: 'オウムがえし',
      target: get(2),
    });
  });

  it('相手がまだ技を使っていなければ失敗する', async () => {
    // Arrange
    const { get, callMove, context } = setup(undefined);

    // Act
    const message = await new MirrorMoveEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('But it failed');
    expect(callMove).not.toHaveBeenCalled();
  });

  it('まねできない技（mirror でないつるぎのまい）なら失敗する', async () => {
    // Arrange
    const { get, callMove, context } = setup(SWORDS_DANCE.id);

    // Act
    const message = await new MirrorMoveEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('But it failed');
    expect(callMove).not.toHaveBeenCalled();
  });
});
