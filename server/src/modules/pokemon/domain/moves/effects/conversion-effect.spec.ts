import { BattlePokemonMove } from '@/modules/battle/domain/entities/battle-pokemon-move.entity';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { Move, MoveCategory } from '../../entities/move.entity';
import { Type } from '../../entities/type.entity';
import { IMoveRepository } from '../../pokemon.repository.interface';
import { ConversionEffect } from './conversion-effect';

const moveRepository = (moves: Record<number, string>): IMoveRepository => ({
  findById: (id: number) =>
    Promise.resolve(
      moves[id]
        ? new Move(
            id,
            `技${id}`,
            `Move${id}`,
            new Type(id, moves[id], moves[id]),
            MoveCategory.Special,
            90,
            100,
            15,
            0,
            null,
          )
        : null,
    ),
  findByPokemonId: () => Promise.resolve([]),
});

describe('ConversionEffect（テクスチャー）', () => {
  it('1 つめの欄の技のタイプに変わる', async () => {
    // Arrange
    const battle = createInMemoryBattle({ types: ['ノーマル'] });
    battle.battleRepository.findBattlePokemonMovesByBattlePokemonStatusId.mockResolvedValue([
      new BattlePokemonMove(12, 1, 202, 15, 15),
      new BattlePokemonMove(11, 1, 201, 15, 15),
    ]);
    const context = battle.context({
      moveRepository: moveRepository({ 201: 'ほのお', 202: 'でんき' }),
    });

    // Act
    const message = await new ConversionEffect().onUse(battle.get(1), battle.get(2), context);

    // Assert
    expect(message).toBe('transformed into the ほのお type!');
    expect(battle.get(1).volatileState.typeOverride).toEqual(['ほのお']);
  });

  it('1 つめの欄の技のタイプをもう持っていれば失敗する', async () => {
    // Arrange
    const battle = createInMemoryBattle({ types: ['ほのお', 'ひこう'] });
    battle.battleRepository.findBattlePokemonMovesByBattlePokemonStatusId.mockResolvedValue([
      new BattlePokemonMove(11, 1, 201, 15, 15),
    ]);
    const context = battle.context({ moveRepository: moveRepository({ 201: 'ほのお' }) });

    // Act
    const message = await new ConversionEffect().onUse(battle.get(1), battle.get(2), context);

    // Assert
    expect(message).toBe('But it failed');
    expect(battle.get(1).volatileState.typeOverride).toBeUndefined();
  });

  it('ものまねで入れ替わった 1 つめの欄は、入れ替わった技のタイプを使う', async () => {
    // Arrange
    const battle = createInMemoryBattle({
      types: ['ノーマル'],
      status: {
        volatileState: {
          moveSlotOverrides: [{ battlePokemonMoveId: 11, moveId: 203, currentPp: 5, maxPp: 5 }],
        },
      },
    });
    battle.battleRepository.findBattlePokemonMovesByBattlePokemonStatusId.mockResolvedValue([
      new BattlePokemonMove(11, 1, 201, 15, 15),
    ]);
    const context = battle.context({
      moveRepository: moveRepository({ 201: 'ほのお', 203: 'くさ' }),
    });

    // Act
    const message = await new ConversionEffect().onUse(battle.get(1), battle.get(2), context);

    // Assert
    expect(message).toBe('transformed into the くさ type!');
    expect(battle.get(1).volatileState.typeOverride).toEqual(['くさ']);
  });

  it('へんしん中は、写した技の欄を ID の小さい順に見て、1 つめの欄の技のタイプに変わる', async () => {
    // Arrange: 写した欄は、相手の技を読んだ順（ID の大きい順）に並んでいる
    const battle = createInMemoryBattle({
      types: ['ノーマル'],
      status: {
        volatileState: {
          transformedIntoStatusId: 2,
          moveSlotOverrides: [
            { battlePokemonMoveId: 21, moveId: 201, currentPp: 5, maxPp: 5 },
            { battlePokemonMoveId: 20, moveId: 202, currentPp: 5, maxPp: 5 },
          ],
        },
      },
    });
    battle.battleRepository.findBattlePokemonMovesByBattlePokemonStatusId.mockResolvedValue([]);
    const context = battle.context({
      moveRepository: moveRepository({ 201: 'ほのお', 202: 'くさ' }),
    });

    // Act
    const message = await new ConversionEffect().onUse(battle.get(1), battle.get(2), context);

    // Assert
    expect(message).toBe('transformed into the くさ type!');
    expect(battle.get(1).volatileState.typeOverride).toEqual(['くさ']);
  });

  it.each([
    ['アルセウス', 493],
    ['シルヴァディ', 773],
  ])('%s のタイプは変えられず失敗する', async (_name, nationalDex) => {
    // Arrange
    const battle = createInMemoryBattle({ types: ['ノーマル'], nationalDex });
    battle.battleRepository.findBattlePokemonMovesByBattlePokemonStatusId.mockResolvedValue([
      new BattlePokemonMove(11, 1, 201, 15, 15),
    ]);
    const context = battle.context({ moveRepository: moveRepository({ 201: 'ほのお' }) });

    // Act
    const message = await new ConversionEffect().onUse(battle.get(1), battle.get(2), context);

    // Assert
    expect(message).toBe('But it failed');
    expect(battle.get(1).volatileState.typeOverride).toBeUndefined();
  });

  it('技の欄がなければ失敗する', async () => {
    // Arrange
    const battle = createInMemoryBattle();
    battle.battleRepository.findBattlePokemonMovesByBattlePokemonStatusId.mockResolvedValue([]);
    const context = battle.context({ moveRepository: moveRepository({}) });

    // Act
    const message = await new ConversionEffect().onUse(battle.get(1), battle.get(2), context);

    // Assert
    expect(message).toBe('But it failed');
    expect(battle.get(1).volatileState.typeOverride).toBeUndefined();
  });
});
