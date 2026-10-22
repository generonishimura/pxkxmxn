import { ActionOrderDeterminerService } from './action-order-determiner.service';
import { ActionOrderDeterminer } from '../../domain/logic/action-order-determiner';
import { Battle, BattleStatus } from '../../domain/entities/battle.entity';
import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import { SideState } from '../../domain/state/side-state';
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
])('%s - 場の状態による行動順', (_name, createDeterminer) => {
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
  const quickAttack = new Move(
    2,
    'でんこうせっか',
    'Quick Attack',
    NORMAL,
    MoveCategory.Physical,
    40,
    100,
    30,
    1,
    null,
  );

  const createStatus = (id: number): BattlePokemonStatus =>
    new BattlePokemonStatus(id, 1, id, id, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

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

  const order = async (
    sideState: SideState,
    options: { speed1?: number; speed2?: number; move1?: Move } = {},
  ): Promise<number[]> => {
    const moves = [tackle, quickAttack];
    const moveRepository = {
      findById: jest.fn((id: number) => Promise.resolve(moves.find(m => m.id === id) ?? null)),
      findByPokemonId: jest.fn(),
    } as jest.Mocked<IMoveRepository>;
    const trainedPokemons = [
      createTrainedPokemon(1, options.speed1 ?? 50),
      createTrainedPokemon(2, options.speed2 ?? 100),
    ];
    const trainedPokemonRepository = {
      findById: jest.fn((id: number) => Promise.resolve(trainedPokemons[id - 1])),
      findByTrainerId: jest.fn(),
    } as jest.Mocked<ITrainedPokemonRepository>;
    const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null, sideState);
    const actions = await createDeterminer(moveRepository, trainedPokemonRepository).determine({
      battle,
      trainer1Action: { trainerId: 1, moveId: (options.move1 ?? tackle).id },
      trainer2Action: { trainerId: 2, moveId: tackle.id },
      trainer1Active: createStatus(1),
      trainer2Active: createStatus(2),
    });
    return actions.map(action => action.trainerId);
  };

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('おいかぜの陣営のポケモンは素早さが 2 倍になり、速い相手より先に動く', async () => {
    // Act
    const trainerIds = await order({ sides: { '1': { tailwindTurns: 3 } } }, { speed1: 70 });

    // Assert
    expect(trainerIds).toEqual([1, 2]);
  });

  it('おいかぜがなければ、速い相手が先に動く', async () => {
    // Act
    const trainerIds = await order({}, { speed1: 70 });

    // Assert
    expect(trainerIds).toEqual([2, 1]);
  });

  it('トリックルームの間は、遅いポケモンが先に動く', async () => {
    // Act
    const trainerIds = await order({ global: { trickRoomTurns: 4 } });

    // Assert
    expect(trainerIds).toEqual([1, 2]);
  });

  it('トリックルームでも、優先度の高い技は先に出る', async () => {
    // Act
    const trainerIds = await order(
      { global: { trickRoomTurns: 4 } },
      { speed1: 100, speed2: 50, move1: quickAttack },
    );

    // Assert
    expect(trainerIds).toEqual([1, 2]);
  });
});
