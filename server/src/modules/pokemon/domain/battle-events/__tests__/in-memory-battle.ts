import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';
import { Nature } from '@/modules/battle/domain/logic/stat-calculator';
import { ITrainedPokemonRepository } from '@/modules/trainer/domain/trainer.repository.interface';
import { TrainedPokemon, Gender } from '@/modules/trainer/domain/entities/trained-pokemon.entity';
import { Pokemon } from '../../entities/pokemon.entity';
import { Type } from '../../entities/type.entity';
import { Ability, AbilityTrigger, AbilityCategory } from '../../entities/ability.entity';
import { BattleContext } from '../../abilities/battle-context.interface';

/**
 * バトルイベントの補助関数のテスト用に、ポケモンの状態をメモリ上で持つバトルを作る
 * ID 1 がトレーナー1、ID 2 がトレーナー2 の場のポケモン
 */
export interface InMemoryPokemon {
  ability?: string;
  types?: readonly string[];
  status?: Partial<BattlePokemonStatus>;
}

const toType = (name: string, index: number): Type => new Type(index + 1, name, name);

const toStatus = (id: number, data: Partial<BattlePokemonStatus> = {}): BattlePokemonStatus => {
  const merged = {
    ...new BattlePokemonStatus(id, 1, id, id, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null),
    ...data,
  };
  return new BattlePokemonStatus(
    merged.id,
    merged.battleId,
    merged.trainedPokemonId,
    merged.trainerId,
    merged.isActive,
    merged.currentHp,
    merged.maxHp,
    merged.attackRank,
    merged.defenseRank,
    merged.specialAttackRank,
    merged.specialDefenseRank,
    merged.speedRank,
    merged.accuracyRank,
    merged.evasionRank,
    merged.statusCondition,
    merged.volatileState,
  );
};

const toTrainedPokemon = (id: number, pokemon: InMemoryPokemon): TrainedPokemon => {
  const [primary, secondary] = (pokemon.types ?? ['ノーマル']).map(toType);
  return new TrainedPokemon(
    id,
    id,
    new Pokemon(id, id, 'テスト', 'Test', primary, secondary ?? null, 100, 100, 100, 100, 100, 100),
    null,
    50,
    Gender.Male,
    Nature.Hardy,
    pokemon.ability
      ? new Ability(
          id,
          pokemon.ability,
          pokemon.ability,
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
};

export const createInMemoryBattle = (first: InMemoryPokemon = {}, second: InMemoryPokemon = {}) => {
  const statuses = new Map<number, BattlePokemonStatus>([
    [1, toStatus(1, first.status)],
    [2, toStatus(2, second.status)],
  ]);
  const trainedPokemons = new Map<number, TrainedPokemon>([
    [1, toTrainedPokemon(1, first)],
    [2, toTrainedPokemon(2, second)],
  ]);
  const battleRepository: jest.Mocked<IBattleRepository> = {
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findBattlePokemonStatusByBattleId: jest.fn((_battleId: number) =>
      Promise.resolve([...statuses.values()]),
    ),
    createBattlePokemonStatus: jest.fn(),
    updateBattlePokemonStatus: jest.fn((id: number, data: Partial<BattlePokemonStatus>) => {
      const updated = toStatus(id, { ...statuses.get(id), ...data });
      statuses.set(id, updated);
      return Promise.resolve(updated);
    }),
    findActivePokemonByBattleIdAndTrainerId: jest.fn((_battleId: number, trainerId: number) =>
      Promise.resolve([...statuses.values()].find(s => s.trainerId === trainerId) ?? null),
    ),
    findBattlePokemonStatusById: jest.fn((id: number) => Promise.resolve(statuses.get(id) ?? null)),
    findBattlePokemonMovesByBattlePokemonStatusId: jest.fn(),
    createBattlePokemonMove: jest.fn(),
    updateBattlePokemonMove: jest.fn(),
    findBattlePokemonMoveById: jest.fn(),
  };
  const trainedPokemonRepository: jest.Mocked<ITrainedPokemonRepository> = {
    findById: jest.fn((id: number) => Promise.resolve(trainedPokemons.get(id) ?? null)),
    findByTrainerId: jest.fn(),
  };
  const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);
  const context = (data: Partial<BattleContext> = {}): BattleContext => ({
    battle,
    battleRepository,
    trainedPokemonRepository,
    ...data,
  });
  const get = (id: number): BattlePokemonStatus => statuses.get(id)!;

  return { statuses, battleRepository, trainedPokemonRepository, context, get };
};
