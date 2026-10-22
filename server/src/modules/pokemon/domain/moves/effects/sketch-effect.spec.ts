import { SketchEffect } from './sketch-effect';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { Move, MoveCategory } from '../../entities/move.entity';
import { Type } from '../../entities/type.entity';
import { IMoveRepository } from '../../pokemon.repository.interface';
import { BattlePokemonMove } from '@/modules/battle/domain/entities/battle-pokemon-move.entity';
import { VolatileState } from '@/modules/battle/domain/state/volatile-state';

const NORMAL = new Type(1, 'ノーマル', 'Normal');
const statusMove = (id: number, name: string, pp: number): Move =>
  new Move(id, name, name, NORMAL, MoveCategory.Status, null, null, pp, 0, null);
const SKETCH = statusMove(10, 'スケッチ', 1);
const SPORE = statusMove(20, 'キノコのほうし', 15);
const STRUGGLE = new Move(
  30,
  'わるあがき',
  'Struggle',
  NORMAL,
  MoveCategory.Physical,
  50,
  null,
  1,
  0,
  null,
);
const SWORDS_DANCE = statusMove(40, 'つるぎのまい', 20);

const createMoveRepository = (): jest.Mocked<IMoveRepository> => {
  const moves = new Map([SKETCH, SPORE, STRUGGLE, SWORDS_DANCE].map(move => [move.id, move]));
  return {
    findById: jest.fn((id: number) => Promise.resolve(moves.get(id) ?? null)),
    findByPokemonId: jest.fn(),
  };
};

/**
 * 使用者（ID 1）がスケッチ（欄 101）とつるぎのまい（欄 102）を覚え、相手（ID 2）が lastMoveId の技を最後に使った
 */
const setup = (defenderLastMoveId: number | undefined, attackerState: VolatileState = {}) => {
  const battle = createInMemoryBattle(
    { status: { volatileState: attackerState } },
    { status: { volatileState: { lastMoveId: defenderLastMoveId } } },
  );
  battle.battleRepository.findBattlePokemonMovesByBattlePokemonStatusId.mockResolvedValue([
    new BattlePokemonMove(101, 1, SKETCH.id, 0, 1),
    new BattlePokemonMove(102, 1, SWORDS_DANCE.id, 20, 20),
  ]);
  const context = () =>
    battle.context({
      moveId: SKETCH.id,
      moveName: 'スケッチ',
      moveRepository: createMoveRepository(),
    });
  return { ...battle, context };
};

describe('SketchEffect（スケッチ）', () => {
  it('相手が最後に使った技で、スケッチの欄をずっと書き換える（PP は技の最大 PP）', async () => {
    // Arrange
    const { get, battleRepository, context } = setup(SPORE.id);

    // Act
    const message = await new SketchEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('sketched キノコのほうし!');
    expect(battleRepository.updateBattlePokemonMove).toHaveBeenCalledWith(101, {
      moveId: SPORE.id,
      currentPp: 15,
      maxPp: 15,
    });
  });

  it('相手がまだ技を使っていなければ失敗する', async () => {
    // Arrange
    const { get, battleRepository, context } = setup(undefined);

    // Act
    const message = await new SketchEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('But it failed');
    expect(battleRepository.updateBattlePokemonMove).not.toHaveBeenCalled();
  });

  it('スケッチできない技（noSketch のわるあがき）なら失敗する', async () => {
    // Arrange
    const { get, battleRepository, context } = setup(STRUGGLE.id);

    // Act
    const message = await new SketchEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('But it failed');
    expect(battleRepository.updateBattlePokemonMove).not.toHaveBeenCalled();
  });

  it('自分がすでに覚えている技なら失敗する', async () => {
    // Arrange
    const { get, battleRepository, context } = setup(SWORDS_DANCE.id);

    // Act
    const message = await new SketchEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('But it failed');
    expect(battleRepository.updateBattlePokemonMove).not.toHaveBeenCalled();
  });

  it('へんしん中は失敗する', async () => {
    // Arrange
    const { get, battleRepository, context } = setup(SPORE.id, { transformedIntoStatusId: 2 });

    // Act
    const message = await new SketchEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('But it failed');
    expect(battleRepository.updateBattlePokemonMove).not.toHaveBeenCalled();
  });
});
