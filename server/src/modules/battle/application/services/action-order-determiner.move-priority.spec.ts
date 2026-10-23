import { ActionOrderDeterminerService } from './action-order-determiner.service';
import { ActionOrderDeterminer } from '../../domain/logic/action-order-determiner';
import { Battle, BattleStatus, Field } from '../../domain/entities/battle.entity';
import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import { Nature } from '../../domain/logic/stat-calculator';
import { IMoveRepository } from '@/modules/pokemon/domain/pokemon.repository.interface';
import { ITrainedPokemonRepository } from '@/modules/trainer/domain/trainer.repository.interface';
import { Move, MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { Type } from '@/modules/pokemon/domain/entities/type.entity';
import { Pokemon } from '@/modules/pokemon/domain/entities/pokemon.entity';
import { TrainedPokemon, Gender } from '@/modules/trainer/domain/entities/trained-pokemon.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { MoveRegistry } from '@/modules/pokemon/domain/moves/move-registry';

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
])('%s - 技の modifyPriority（グラススライダー）', (_name, createDeterminer) => {
  const NORMAL = new Type(1, 'ノーマル', 'Normal');
  const GRASS = new Type(12, 'くさ', 'Grass');
  const FLYING = new Type(3, 'ひこう', 'Flying');
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
  const grassyGlide = new Move(
    2,
    'グラススライダー',
    'Grassy Glide',
    GRASS,
    MoveCategory.Physical,
    55,
    100,
    20,
    0,
    null,
  );

  const createStatus = (id: number): BattlePokemonStatus =>
    new BattlePokemonStatus(id, 1, id, id, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const createTrainedPokemon = (id: number, baseSpeed: number, primary: Type): TrainedPokemon =>
    new TrainedPokemon(
      id,
      id,
      new Pokemon(id, id, 'テスト', 'Test', primary, null, 100, 100, 100, 100, 100, baseSpeed),
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

  /**
   * 遅いトレーナー 1 がグラススライダー、速いトレーナー 2 がたいあたりを出したときの順番
   */
  const order = async (field: Field | null, userType: Type = GRASS): Promise<number[]> => {
    const moves = [tackle, grassyGlide];
    const moveRepository = {
      findById: jest.fn((id: number) => Promise.resolve(moves.find(m => m.id === id) ?? null)),
      findByPokemonId: jest.fn(),
    } as jest.Mocked<IMoveRepository>;
    const trainedPokemons = [
      createTrainedPokemon(1, 50, userType),
      createTrainedPokemon(2, 100, NORMAL),
    ];
    const trainedPokemonRepository = {
      findById: jest.fn((id: number) => Promise.resolve(trainedPokemons[id - 1])),
      findByTrainerId: jest.fn(),
    } as jest.Mocked<ITrainedPokemonRepository>;
    const battle = new Battle(1, 1, 2, 1, 2, 1, null, field, BattleStatus.Active, null);
    const actions = await createDeterminer(moveRepository, trainedPokemonRepository).determine({
      battle,
      trainer1Action: { trainerId: 1, moveId: grassyGlide.id },
      trainer2Action: { trainerId: 2, moveId: tackle.id },
      trainer1Active: createStatus(1),
      trainer2Active: createStatus(2),
    });
    return actions.map(action => action.trainerId);
  };

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    MoveRegistry.initialize();
  });

  it('グラスフィールドで、地面にいる使用者のグラススライダーは速い相手より先に出る', async () => {
    // Act
    const trainerIds = await order(Field.GrassyTerrain);

    // Assert
    expect(trainerIds).toEqual([1, 2]);
  });

  it('グラスフィールドでなければ、優先度は変わらない', async () => {
    // Act
    const trainerIds = await order(null);

    // Assert
    expect(trainerIds).toEqual([2, 1]);
  });

  it('使用者が地面にいない（ひこうタイプ）なら、優先度は変わらない', async () => {
    // Act
    const trainerIds = await order(Field.GrassyTerrain, FLYING);

    // Assert
    expect(trainerIds).toEqual([2, 1]);
  });
});
