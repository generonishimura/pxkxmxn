import { ActionOrderDeterminerService } from './action-order-determiner.service';
import { Battle, BattleStatus } from '../../domain/entities/battle.entity';
import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import { Nature } from '../../domain/logic/stat-calculator';
import { IMoveRepository } from '@/modules/pokemon/domain/pokemon.repository.interface';
import { ITrainedPokemonRepository } from '@/modules/trainer/domain/trainer.repository.interface';
import { Move, MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { Type } from '@/modules/pokemon/domain/entities/type.entity';
import { Pokemon } from '@/modules/pokemon/domain/entities/pokemon.entity';
import { TrainedPokemon, Gender } from '@/modules/trainer/domain/entities/trained-pokemon.entity';
import { ItemRegistry } from '@/modules/pokemon/domain/items/item-registry';

describe('ActionOrderDeterminerService - 持ち物の素早さ補正', () => {
  const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);

  const createStatus = (id: number, item?: string): BattlePokemonStatus =>
    new BattlePokemonStatus(
      id,
      1,
      id,
      id,
      true,
      100,
      100,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      null,
      {},
      item === undefined ? {} : { item },
    );

  const createTrainedPokemon = (id: number, baseSpeed: number): TrainedPokemon =>
    new TrainedPokemon(
      id,
      id,
      new Pokemon(
        id,
        id,
        'テスト',
        'Test',
        new Type(1, 'ノーマル', 'Normal'),
        null,
        100,
        100,
        100,
        100,
        100,
        baseSpeed,
      ),
      null,
      Gender.Male,
      Nature.Serious,
      null,
      0,
      0,
      0,
      0,
      0,
      0,
    );

  const statusMove = new Move(
    1,
    'なきごえ',
    'Growl',
    new Type(1, 'ノーマル', 'Normal'),
    MoveCategory.Status,
    null,
    100,
    40,
    0,
    null,
  );

  // 優先度 +1 の技
  const priorityMove = new Move(
    2,
    'でんこうせっか',
    'Quick Attack',
    new Type(1, 'ノーマル', 'Normal'),
    MoveCategory.Physical,
    40,
    100,
    30,
    1,
    null,
  );

  const createDeterminer = (): ActionOrderDeterminerService => {
    const moveRepository: jest.Mocked<IMoveRepository> = {
      findById: jest.fn((id: number) =>
        Promise.resolve(id === priorityMove.id ? priorityMove : statusMove),
      ),
      findByPokemonId: jest.fn(),
    };
    // トレーナー1のポケモンの方が速い（素早さ種族値 150 と 100）
    const trainedPokemons = new Map([
      [1, createTrainedPokemon(1, 150)],
      [2, createTrainedPokemon(2, 100)],
    ]);
    const trainedPokemonRepository: jest.Mocked<ITrainedPokemonRepository> = {
      findById: jest.fn((id: number) => Promise.resolve(trainedPokemons.get(id) ?? null)),
      findByTrainerId: jest.fn(),
    };
    return new ActionOrderDeterminerService(moveRepository, trainedPokemonRepository);
  };

  beforeEach(() => {
    ItemRegistry.initialize();
    ItemRegistry.register('テストの素早さ2倍', { modifySpeed: (_pokemon, speed) => speed * 2 });
    ItemRegistry.register('テストの先に動く', { modifyFractionalPriority: () => 0.1 });
  });

  afterEach(() => {
    ItemRegistry.initialize();
  });

  it('持ち物が素早さを変えると、変えた素早さで行動順を決める（modifySpeed）', async () => {
    // Arrange
    const determiner = createDeterminer();

    // Act
    const actions = await determiner.determine({
      battle,
      trainer1Action: { trainerId: 1, moveId: 1 },
      trainer2Action: { trainerId: 2, moveId: 1 },
      trainer1Active: createStatus(1),
      trainer2Active: createStatus(2, 'テストの素早さ2倍'),
    });

    // Assert
    expect(actions[0].trainerId).toBe(2);
  });

  it('持ち物がなければ、速いポケモンが先に動く', async () => {
    // Arrange
    const determiner = createDeterminer();

    // Act
    const actions = await determiner.determine({
      battle,
      trainer1Action: { trainerId: 1, moveId: 1 },
      trainer2Action: { trainerId: 2, moveId: 1 },
      trainer1Active: createStatus(1),
      trainer2Active: createStatus(2),
    });

    // Assert
    expect(actions[0].trainerId).toBe(1);
  });

  describe('同じ優先度の中の順番（modifyFractionalPriority）', () => {
    it('持ち物が優先度に小数を足すと、遅くても同じ優先度の中で先に動く', async () => {
      // Arrange
      const determiner = createDeterminer();

      // Act
      const actions = await determiner.determine({
        battle,
        trainer1Action: { trainerId: 1, moveId: 1 },
        trainer2Action: { trainerId: 2, moveId: 1 },
        trainer1Active: createStatus(1),
        trainer2Active: createStatus(2, 'テストの先に動く'),
      });

      // Assert
      expect(actions[0].trainerId).toBe(2);
    });

    it('優先度の高い技には追い越されない', async () => {
      // Arrange
      const determiner = createDeterminer();

      // Act
      const actions = await determiner.determine({
        battle,
        trainer1Action: { trainerId: 1, moveId: 1 },
        trainer2Action: { trainerId: 2, moveId: 2 },
        trainer1Active: createStatus(1, 'テストの先に動く'),
        trainer2Active: createStatus(2),
      });

      // Assert
      expect(actions[0].trainerId).toBe(2);
    });
  });
});
