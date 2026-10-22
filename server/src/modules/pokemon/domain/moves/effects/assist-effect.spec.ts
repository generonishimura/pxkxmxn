import { AssistEffect } from './assist-effect';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { Move, MoveCategory } from '../../entities/move.entity';
import { Type } from '../../entities/type.entity';
import { IMoveRepository } from '../../pokemon.repository.interface';
import { CallMove } from '../../battle-events/called-move';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattlePokemonMove } from '@/modules/battle/domain/entities/battle-pokemon-move.entity';

const NORMAL = new Type(1, 'ノーマル', 'Normal');
const moveOf = (id: number, name: string): Move =>
  new Move(id, name, name, NORMAL, MoveCategory.Physical, 40, 100, 10, 0, null);
const TACKLE = moveOf(10, 'たいあたり');
const FLAMETHROWER = moveOf(20, 'かえんほうしゃ');
const QUICK_ATTACK = moveOf(30, 'でんこうせっか');
const PROTECT = moveOf(40, 'まもる');
const SURF = moveOf(50, 'なみのり');

const benchOf = (id: number, trainerId: number, currentHp = 100): BattlePokemonStatus =>
  new BattlePokemonStatus(id, 1, id, trainerId, false, currentHp, 100, 0, 0, 0, 0, 0, 0, 0, null);

/**
 * 使用者（ID 1）はたいあたり、控えの味方（ID 3・4）はかえんほうしゃ・まもる / でんこうせっか、
 * 相手（ID 2）と相手の控え（ID 5）はなみのりを覚えている
 */
const setup = (benchHp = 100) => {
  const battle = createInMemoryBattle();
  battle.statuses.set(3, benchOf(3, 1, benchHp));
  battle.statuses.set(4, benchOf(4, 1));
  battle.statuses.set(5, benchOf(5, 2));
  const movesByStatusId = new Map<number, Move[]>([
    [1, [TACKLE]],
    [2, [SURF]],
    [3, [FLAMETHROWER, PROTECT]],
    [4, [QUICK_ATTACK]],
    [5, [SURF]],
  ]);
  battle.battleRepository.findBattlePokemonMovesByBattlePokemonStatusId.mockImplementation(
    (statusId: number) =>
      Promise.resolve(
        (movesByStatusId.get(statusId) ?? []).map(
          (move, index) => new BattlePokemonMove(statusId * 10 + index, statusId, move.id, 10, 10),
        ),
      ),
  );
  const allMoves = new Map(
    [TACKLE, FLAMETHROWER, QUICK_ATTACK, PROTECT, SURF].map(move => [move.id, move]),
  );
  const moveRepository: jest.Mocked<IMoveRepository> = {
    findById: jest.fn((id: number) => Promise.resolve(allMoves.get(id) ?? null)),
    findByPokemonId: jest.fn(),
  };
  const callMove: jest.MockedFunction<CallMove> = jest.fn().mockResolvedValue('Used テスト');
  const context = () => battle.context({ callMove, moveRepository });
  return { ...battle, callMove, context };
};

describe('AssistEffect（ねこのて）', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('控えの味方が覚えている技（noAssist でない）から一つを選んで出す', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.99);
    const { get, callMove, context } = setup();
    const effect = new AssistEffect();

    // Act
    const first = await effect.onUse(get(1), get(2), context());
    await effect.onUse(get(1), get(2), context());

    // Assert
    expect(first).toBe('Used テスト');
    // 候補はかえんほうしゃ・でんこうせっか（まもるは noAssist、自分と相手の技は入らない）
    expect(callMove.mock.calls.map(([request]) => request)).toEqual([
      { moveId: FLAMETHROWER.id, calledBy: 'ねこのて' },
      { moveId: QUICK_ATTACK.id, calledBy: 'ねこのて' },
    ]);
  });

  it('ひんしの味方の技も候補に入る', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const { get, callMove, context } = setup(0);

    // Act
    await new AssistEffect().onUse(get(1), get(2), context());

    // Assert
    expect(callMove).toHaveBeenCalledWith({ moveId: FLAMETHROWER.id, calledBy: 'ねこのて' });
  });

  it('控えの味方がいなければ失敗する', async () => {
    // Arrange
    const { get, statuses, callMove, context } = setup();
    statuses.delete(3);
    statuses.delete(4);

    // Act
    const message = await new AssistEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('But it failed');
    expect(callMove).not.toHaveBeenCalled();
  });
});
