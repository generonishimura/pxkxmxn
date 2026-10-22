import { MimicEffect } from './mimic-effect';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { Move, MoveCategory } from '../../entities/move.entity';
import { Type } from '../../entities/type.entity';
import { IMoveRepository } from '../../pokemon.repository.interface';
import { BattlePokemonMove } from '@/modules/battle/domain/entities/battle-pokemon-move.entity';
import { VolatileState } from '@/modules/battle/domain/state/volatile-state';

const NORMAL = new Type(1, 'ノーマル', 'Normal');
const MIMIC = new Move(
  10,
  'ものまね',
  'Mimic',
  NORMAL,
  MoveCategory.Status,
  null,
  null,
  10,
  0,
  null,
);
const TACKLE = new Move(
  20,
  'たいあたり',
  'Tackle',
  NORMAL,
  MoveCategory.Physical,
  40,
  100,
  35,
  0,
  null,
);
const METRONOME = new Move(
  30,
  'ゆびをふる',
  'Metronome',
  NORMAL,
  MoveCategory.Status,
  null,
  null,
  10,
  0,
  null,
);
const QUICK_ATTACK = new Move(
  40,
  'でんこうせっか',
  'Quick Attack',
  NORMAL,
  MoveCategory.Physical,
  40,
  100,
  30,
  0,
  null,
);

const createMoveRepository = (): jest.Mocked<IMoveRepository> => {
  const moves = new Map([MIMIC, TACKLE, METRONOME, QUICK_ATTACK].map(move => [move.id, move]));
  return {
    findById: jest.fn((id: number) => Promise.resolve(moves.get(id) ?? null)),
    findByPokemonId: jest.fn(),
  };
};

/**
 * 使用者（ID 1）がものまね（欄 101）とでんこうせっか（欄 102）を覚え、相手（ID 2）が lastMoveId の技を最後に使った
 */
const setup = (defenderLastMoveId: number | undefined, attackerState: VolatileState = {}) => {
  const battle = createInMemoryBattle(
    { status: { volatileState: attackerState } },
    { status: { volatileState: { lastMoveId: defenderLastMoveId } } },
  );
  battle.battleRepository.findBattlePokemonMovesByBattlePokemonStatusId.mockResolvedValue([
    new BattlePokemonMove(101, 1, MIMIC.id, 9, 10),
    new BattlePokemonMove(102, 1, QUICK_ATTACK.id, 30, 30),
  ]);
  const context = () =>
    battle.context({
      moveId: MIMIC.id,
      moveName: 'ものまね',
      moveRepository: createMoveRepository(),
    });
  return { ...battle, context };
};

describe('MimicEffect（ものまね）', () => {
  it('相手が最後に使った技を、ものまねの欄に入れる（PP は技の最大 PP）', async () => {
    // Arrange
    const { get, context } = setup(TACKLE.id);

    // Act
    const message = await new MimicEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('learned たいあたり!');
    expect(get(1).volatileState.moveSlotOverrides).toEqual([
      { battlePokemonMoveId: 101, moveId: TACKLE.id, currentPp: 35, maxPp: 35 },
    ]);
  });

  it('ほかの入れ替え（moveSlotOverrides）は残す', async () => {
    // Arrange
    const existing = { battlePokemonMoveId: 999, moveId: 77, currentPp: 5, maxPp: 5 };
    const { get, context } = setup(TACKLE.id, { moveSlotOverrides: [existing] });

    // Act
    await new MimicEffect().onUse(get(1), get(2), context());

    // Assert
    expect(get(1).volatileState.moveSlotOverrides).toEqual([
      existing,
      { battlePokemonMoveId: 101, moveId: TACKLE.id, currentPp: 35, maxPp: 35 },
    ]);
  });

  it('相手がまだ技を使っていなければ失敗する', async () => {
    // Arrange
    const { get, context } = setup(undefined);

    // Act
    const message = await new MimicEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('But it failed');
    expect(get(1).volatileState.moveSlotOverrides).toBeUndefined();
  });

  it('ものまねできない技（failMimic のゆびをふる）なら失敗する', async () => {
    // Arrange
    const { get, context } = setup(METRONOME.id);

    // Act
    const message = await new MimicEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('But it failed');
    expect(get(1).volatileState.moveSlotOverrides).toBeUndefined();
  });

  it('自分がすでに覚えている技なら失敗する', async () => {
    // Arrange
    const { get, context } = setup(QUICK_ATTACK.id);

    // Act
    const message = await new MimicEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('But it failed');
  });

  it('へんしん中は失敗する', async () => {
    // Arrange
    const { get, context } = setup(TACKLE.id, { transformedIntoStatusId: 2 });

    // Act
    const message = await new MimicEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('But it failed');
  });

  it('ものまねを覚えていない（ほかの技から呼ばれた）なら失敗する', async () => {
    // Arrange
    const { get, battleRepository, context } = setup(TACKLE.id);
    battleRepository.findBattlePokemonMovesByBattlePokemonStatusId.mockResolvedValue([
      new BattlePokemonMove(102, 1, QUICK_ATTACK.id, 30, 30),
    ]);

    // Act
    const message = await new MimicEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('But it failed');
  });
});
