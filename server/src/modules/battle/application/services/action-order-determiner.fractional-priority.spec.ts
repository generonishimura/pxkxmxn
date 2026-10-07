import { ActionOrderDeterminerService } from './action-order-determiner.service';
import { ActionOrderDeterminer } from '../../domain/logic/action-order-determiner';
import { Battle, BattleStatus } from '../../domain/entities/battle.entity';
import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import { Nature } from '../../domain/logic/stat-calculator';
import { IMoveRepository } from '@/modules/pokemon/domain/pokemon.repository.interface';
import { ITrainedPokemonRepository } from '@/modules/trainer/domain/trainer.repository.interface';
import { Move, MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { Type } from '@/modules/pokemon/domain/entities/type.entity';
import { Pokemon } from '@/modules/pokemon/domain/entities/pokemon.entity';
import { TrainedPokemon, Gender } from '@/modules/trainer/domain/entities/trained-pokemon.entity';
import {
  Ability,
  AbilityCategory,
  AbilityTrigger,
} from '@/modules/pokemon/domain/entities/ability.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';

type Determiner = Pick<ActionOrderDeterminerService, 'determine'>;

/**
 * 同じ優先度の中での順番（modifyFractionalPriority。きんしのちから・あとだし・クイックドロウ）
 * ポケモン 1 は素早さ種族値 150（速い）、ポケモン 2 は 100
 */
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
])('%s - 同じ優先度の中での順番', (_name, createDeterminer) => {
  const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);
  const trickRoomBattle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null, {
    global: { trickRoomTurns: 5 },
  });
  const NORMAL = new Type(1, 'ノーマル', 'Normal');

  const createMove = (id: number, category: MoveCategory, priority: number): Move =>
    new Move(id, `テスト技${id}`, 'Test', NORMAL, category, null, null, 10, priority, null);

  const STATUS_MOVE = createMove(1, MoveCategory.Status, 0);
  const PHYSICAL_MOVE = createMove(2, MoveCategory.Physical, 0);
  const PRIORITY_STATUS_MOVE = createMove(3, MoveCategory.Status, 1);
  const moves = [STATUS_MOVE, PHYSICAL_MOVE, PRIORITY_STATUS_MOVE];

  const createTrainedPokemon = (id: number, baseSpeed: number, abilityName?: string) =>
    new TrainedPokemon(
      id,
      id,
      new Pokemon(id, id, 'テスト', 'Test', NORMAL, null, 100, 100, 100, 100, 100, baseSpeed),
      null,
      50,
      Gender.Male,
      Nature.Hardy,
      abilityName
        ? new Ability(
            id,
            abilityName,
            abilityName,
            'テスト用',
            AbilityTrigger.Passive,
            AbilityCategory.Other,
          )
        : null,
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

  const createStatus = (id: number): BattlePokemonStatus =>
    new BattlePokemonStatus(id, 1, id, id, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const determineOrder = async (
    move1: Move,
    move2: Move,
    abilities: { first?: string; second?: string } = {},
    currentBattle: Battle = battle,
  ): Promise<number[]> => {
    const moveRepository: IMoveRepository = {
      findById: (id: number) => Promise.resolve(moves.find(m => m.id === id) ?? null),
      findByPokemonId: () => Promise.resolve([]),
    };
    const trainedPokemons = new Map([
      [1, createTrainedPokemon(1, 150, abilities.first)],
      [2, createTrainedPokemon(2, 100, abilities.second)],
    ]);
    const trainedPokemonRepository: ITrainedPokemonRepository = {
      findById: (id: number) => Promise.resolve(trainedPokemons.get(id) ?? null),
      findByTrainerId: () => Promise.resolve([]),
    };
    const actions = await createDeterminer(moveRepository, trainedPokemonRepository).determine({
      battle: currentBattle,
      trainer1Action: { trainerId: 1, moveId: move1.id },
      trainer2Action: { trainerId: 2, moveId: move2.id },
      trainer1Active: createStatus(1),
      trainer2Active: createStatus(2),
    });
    return actions.map(action => action.trainerId);
  };

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    // きんしのちから相当: 変化技なら同じ優先度の中で最後に動く
    AbilityRegistry.register('テストのきんし', {
      modifyFractionalPriority: (_holder, ctx) =>
        ctx?.moveCategory === 'Status' ? -0.1 : undefined,
    });
  });

  it('modifyFractionalPriority が負なら、速くても同じ優先度の中では後に動く', async () => {
    // Act
    const order = await determineOrder(STATUS_MOVE, PHYSICAL_MOVE, { first: 'テストのきんし' });

    // Assert
    expect(order).toEqual([2, 1]);
  });

  it('modifyFractionalPriority にはコンテキストで技の分類が渡る（攻撃技なら補正しない）', async () => {
    // Act
    const order = await determineOrder(PHYSICAL_MOVE, PHYSICAL_MOVE, { first: 'テストのきんし' });

    // Assert
    expect(order).toEqual([1, 2]);
  });

  it('modifyFractionalPriority は優先度の違いを越えない', async () => {
    // Act
    const order = await determineOrder(PRIORITY_STATUS_MOVE, PHYSICAL_MOVE, {
      first: 'テストのきんし',
    });

    // Assert
    expect(order).toEqual([1, 2]);
  });

  it('両方とも同じだけ補正されたら、素早さで決まる', async () => {
    // Act
    const order = await determineOrder(STATUS_MOVE, STATUS_MOVE, {
      first: 'テストのきんし',
      second: 'テストのきんし',
    });

    // Assert
    expect(order).toEqual([1, 2]);
  });

  it('modifyFractionalPriority は、トリックルームの間も逆にならない', async () => {
    // Act
    const order = await determineOrder(
      PHYSICAL_MOVE,
      STATUS_MOVE,
      { second: 'テストのきんし' },
      trickRoomBattle,
    );

    // Assert
    expect(order).toEqual([1, 2]);
  });

  describe('あとだし', () => {
    it('速くても、同じ優先度の中では最後に動く', async () => {
      // Act
      const order = await determineOrder(PHYSICAL_MOVE, PHYSICAL_MOVE, { first: 'あとだし' });

      // Assert
      expect(order).toEqual([2, 1]);
    });

    it('トリックルームの間も、同じ優先度の中では最後に動く（遅くても先に動かない）', async () => {
      // Act
      const order = await determineOrder(
        PHYSICAL_MOVE,
        PHYSICAL_MOVE,
        { second: 'あとだし' },
        trickRoomBattle,
      );

      // Assert
      expect(order).toEqual([1, 2]);
    });

    it('優先度の高い技なら、優先度の低い相手より先に動く', async () => {
      // Act
      const order = await determineOrder(PRIORITY_STATUS_MOVE, PHYSICAL_MOVE, {
        first: 'あとだし',
      });

      // Assert
      expect(order).toEqual([1, 2]);
    });
  });
});
