import { ActionOrderDeterminerService } from './action-order-determiner.service';
import { ActionOrderDeterminer } from '../../domain/logic/action-order-determiner';
import { Battle, BattleStatus } from '../../domain/entities/battle.entity';
import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import { VolatileState } from '../../domain/state/volatile-state';
import { Nature } from '../../domain/logic/stat-calculator';
import { IMoveRepository } from '@/modules/pokemon/domain/pokemon.repository.interface';
import { ITrainedPokemonRepository } from '@/modules/trainer/domain/trainer.repository.interface';
import { Move, MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { Type } from '@/modules/pokemon/domain/entities/type.entity';
import { Pokemon } from '@/modules/pokemon/domain/entities/pokemon.entity';
import { TrainedPokemon, Gender } from '@/modules/trainer/domain/entities/trained-pokemon.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';

type Determiner = Pick<ActionOrderDeterminerService, 'determine'>;

describe.each([
  [
    'ActionOrderDeterminerService',
    (m: IMoveRepository, t: ITrainedPokemonRepository): Determiner =>
      new ActionOrderDeterminerService(m, t),
  ],
  [
    'ActionOrderDeterminer',
    (m: IMoveRepository, t: ITrainedPokemonRepository): Determiner =>
      new ActionOrderDeterminer(m, t),
  ],
])('%s - 一時的な状態による素早さ', (_name, createDeterminer) => {
  const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);
  const NORMAL = new Type(1, 'ノーマル', 'Normal');
  const tackle = new Move(
    1,
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

  const createStatus = (id: number, volatileState: VolatileState = {}): BattlePokemonStatus =>
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
      volatileState,
    );

  const createTrainedPokemon = (id: number, baseSpeed: number): TrainedPokemon =>
    new TrainedPokemon(
      id,
      id,
      new Pokemon(id, id, 'テスト', 'Test', NORMAL, null, 100, 100, 100, 100, 100, baseSpeed),
      null,
      50,
      Gender.Male,
      Nature.Hardy,
      null,
      31,
      31,
      31,
      31,
      31,
      31,
      0,
      0,
      0,
      0,
      0,
      0,
    );

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('スピードスワップなどで素早さの実数値が上書きされていると、その値で行動順を決める', async () => {
    // Arrange
    const moveRepository = {
      findById: jest.fn().mockResolvedValue(tackle),
      findByPokemonId: jest.fn(),
    } as jest.Mocked<IMoveRepository>;
    const trainedPokemons = [createTrainedPokemon(1, 50), createTrainedPokemon(2, 100)];
    const trainedPokemonRepository = {
      findById: jest.fn((id: number) => Promise.resolve(trainedPokemons[id - 1])),
      findByTrainerId: jest.fn(),
    } as jest.Mocked<ITrainedPokemonRepository>;
    const determiner = createDeterminer(moveRepository, trainedPokemonRepository);

    // Act
    const actions = await determiner.determine({
      battle,
      trainer1Action: { trainerId: 1, moveId: 1 },
      trainer2Action: { trainerId: 2, moveId: 1 },
      trainer1Active: createStatus(1, { statOverrides: { speed: 500 } }),
      trainer2Active: createStatus(2),
    });

    // Assert
    expect(actions.map(action => action.trainerId)).toEqual([1, 2]);
  });
});
