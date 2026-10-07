import { Battle, BattleStatus, Field, Weather } from '../../domain/entities/battle.entity';
import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import { BattlePokemonMove } from '../../domain/entities/battle-pokemon-move.entity';
import { StatusCondition } from '../../domain/entities/status-condition.enum';
import { IBattleRepository } from '../../domain/battle.repository.interface';
import { StatePatch } from '../../domain/state/state-field-parser';
import { VolatileState, updateVolatileState } from '../../domain/state/volatile-state';
import {
  PersistentPokemonState,
  updatePersistentPokemonState,
} from '../../domain/state/persistent-state';
import {
  GlobalFieldState,
  SideConditions,
  SideState,
  updateGlobalFieldState,
  updateSideConditions,
} from '../../domain/state/side-state';
import { Nature } from '../../domain/logic/stat-calculator';
import { ITrainedPokemonRepository } from '@/modules/trainer/domain/trainer.repository.interface';
import { TrainedPokemon, Gender } from '@/modules/trainer/domain/entities/trained-pokemon.entity';
import {
  IMoveRepository,
  ITypeEffectivenessRepository,
} from '@/modules/pokemon/domain/pokemon.repository.interface';
import { Pokemon } from '@/modules/pokemon/domain/entities/pokemon.entity';
import { Type } from '@/modules/pokemon/domain/entities/type.entity';
import { Move, MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import {
  Ability,
  AbilityCategory,
  AbilityTrigger,
} from '@/modules/pokemon/domain/entities/ability.entity';
import { ActionOrderDeterminerService } from '../services/action-order-determiner.service';
import { WinnerCheckerService } from '../services/winner-checker.service';
import { StatusConditionProcessorService } from '../services/status-condition-processor.service';
import { PokemonSwitcherService } from '../services/pokemon-switcher.service';
import { MoveExecutorService } from '../services/move-executor.service';
import { ExecuteTurnUseCase } from '../use-cases/execute-turn.use-case';

/**
 * エンジン全体（ExecuteTurnUseCase と本物のサービス）を、メモリ上のリポジトリで動かすテスト用の部品
 * トレーナー 1 と 2 のバトル（ID 1）。ポケモンの ID は BattlePokemonStatus と TrainedPokemon で同じ
 */

const TYPE_NAMES: ReadonlyArray<readonly [string, string]> = [
  ['ノーマル', 'normal'],
  ['ほのお', 'fire'],
  ['みず', 'water'],
  ['でんき', 'electric'],
  ['くさ', 'grass'],
  ['こおり', 'ice'],
  ['かくとう', 'fighting'],
  ['どく', 'poison'],
  ['じめん', 'ground'],
  ['ひこう', 'flying'],
  ['エスパー', 'psychic'],
  ['むし', 'bug'],
  ['いわ', 'rock'],
  ['ゴースト', 'ghost'],
  ['ドラゴン', 'dragon'],
  ['あく', 'dark'],
  ['はがね', 'steel'],
  ['フェアリー', 'fairy'],
];

/**
 * タイプ名からタイプを引く（ID は TYPE_NAMES の順に 1 から）
 */
export const typeOf = (name: string): Type => {
  const index = TYPE_NAMES.findIndex(([ja]) => ja === name);
  if (index < 0) {
    throw new Error(`unknown type ${name}`);
  }
  return new Type(index + 1, name, TYPE_NAMES[index][1]);
};

/**
 * テストで使うタイプ相性（[技のタイプ, 相手のタイプ, 倍率]）
 */
const DEFAULT_TYPE_CHART: ReadonlyArray<readonly [string, string, number]> = [
  ['いわ', 'ほのお', 2],
  ['いわ', 'ひこう', 2],
  ['いわ', 'むし', 2],
  ['いわ', 'こおり', 2],
  ['いわ', 'かくとう', 0.5],
  ['いわ', 'じめん', 0.5],
  ['いわ', 'はがね', 0.5],
  ['じめん', 'ひこう', 0],
  ['でんき', 'じめん', 0],
  ['ノーマル', 'ゴースト', 0],
  ['かくとう', 'ゴースト', 0],
];

/**
 * 技を作る（命中率は既定で必中にする）
 */
export const createTestMove = (
  id: number,
  name: string,
  options: {
    type?: string;
    category?: MoveCategory;
    power?: number | null;
    accuracy?: number | null;
    priority?: number;
  } = {},
): Move => {
  const category = options.category ?? MoveCategory.Physical;
  return new Move(
    id,
    name,
    name,
    typeOf(options.type ?? 'ノーマル'),
    category,
    options.power !== undefined ? options.power : category === MoveCategory.Status ? null : 50,
    options.accuracy !== undefined ? options.accuracy : null,
    10,
    options.priority ?? 0,
    null,
  );
};

/**
 * バトルに出るポケモン
 */
export interface HarnessPokemon {
  readonly id: number;
  readonly trainerId: number;
  readonly active?: boolean;
  readonly types?: readonly string[];
  readonly ability?: string;
  readonly currentHp?: number;
  readonly maxHp?: number;
  readonly baseSpeed?: number;
  readonly statusCondition?: StatusCondition | null;
  readonly volatileState?: VolatileState;
  readonly persistentState?: PersistentPokemonState;
  /** 覚えている技の ID（PP は 10） */
  readonly moveIds?: readonly number[];
  /** 全国図鑑の番号（フォルムの表を引く。省略すると id） */
  readonly nationalDex?: number;
  /** 種族値 [HP, 攻撃, 防御, 特攻, 特防, 素早さ]（省略するとすべて 100。素早さは baseSpeed が優先） */
  readonly baseStats?: readonly [number, number, number, number, number, number];
}

export interface HarnessOptions {
  readonly pokemon: readonly HarnessPokemon[];
  readonly moves: readonly Move[];
  readonly turn?: number;
  readonly weather?: Weather | null;
  readonly field?: Field | null;
  readonly sideState?: SideState;
  /**
   * 急所の乱数（0 以上 1 未満）。省略すると急所ランク 3 以上（必ず急所）のときだけ急所になる
   */
  readonly criticalHitRandom?: () => number;
  /** 既定の表に足すタイプ相性（[技のタイプ, 相手のタイプ, 倍率]） */
  readonly typeChart?: ReadonlyArray<readonly [string, string, number]>;
}

/**
 * 急所を出さない乱数（急所ランク 3 以上なら、乱数を引かずに急所になる）
 * 既存のダメージのテストが、1/24 の急所で揺れないようにする
 */
export const NO_CRITICAL_HIT_RANDOM = (): number => 1;

const toStatus = (base: BattlePokemonStatus, data: Partial<BattlePokemonStatus>) => {
  const merged = { ...base, ...data };
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
    merged.persistentState,
  );
};

const toTrainedPokemon = (pokemon: HarnessPokemon): TrainedPokemon => {
  const [primary, secondary] = (pokemon.types ?? ['ノーマル']).map(typeOf);
  const [hp, attack, defense, specialAttack, specialDefense, speed] = pokemon.baseStats ?? [
    100, 100, 100, 100, 100, 100,
  ];
  return new TrainedPokemon(
    pokemon.id,
    pokemon.trainerId,
    new Pokemon(
      pokemon.id,
      pokemon.nationalDex ?? pokemon.id,
      'テスト',
      'Test',
      primary,
      secondary ?? null,
      hp,
      attack,
      defense,
      specialAttack,
      specialDefense,
      pokemon.baseSpeed ?? speed,
    ),
    null,
    50,
    Gender.Male,
    Nature.Hardy,
    pokemon.ability
      ? new Ability(
          pokemon.id,
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

export const createBattleEngine = (options: HarnessOptions) => {
  let battle = new Battle(
    1,
    1,
    2,
    1,
    2,
    options.turn ?? 1,
    options.weather ?? null,
    options.field ?? null,
    BattleStatus.Active,
    null,
    options.sideState ?? {},
  );
  const statuses = new Map<number, BattlePokemonStatus>();
  const trainedPokemons = new Map<number, TrainedPokemon>();
  const pokemonMoves = new Map<number, BattlePokemonMove>();
  for (const pokemon of options.pokemon) {
    const maxHp = pokemon.maxHp ?? 160;
    statuses.set(
      pokemon.id,
      new BattlePokemonStatus(
        pokemon.id,
        1,
        pokemon.id,
        pokemon.trainerId,
        pokemon.active ?? false,
        pokemon.currentHp ?? maxHp,
        maxHp,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        pokemon.statusCondition ?? StatusCondition.None,
        pokemon.volatileState ?? {},
        pokemon.persistentState ?? {},
      ),
    );
    trainedPokemons.set(pokemon.id, toTrainedPokemon(pokemon));
    (pokemon.moveIds ?? []).forEach((moveId, index) => {
      const id = pokemon.id * 10 + index;
      pokemonMoves.set(id, new BattlePokemonMove(id, pokemon.id, moveId, 10, 10));
    });
  }

  const saveBattle = (data: Partial<Battle>): Battle => {
    const merged = { ...battle, ...data };
    battle = new Battle(
      merged.id,
      merged.trainer1Id,
      merged.trainer2Id,
      merged.team1Id,
      merged.team2Id,
      merged.turn,
      merged.weather,
      merged.field,
      merged.status,
      merged.winnerTrainerId,
      merged.sideState,
    );
    return battle;
  };
  const saveStatus = (id: number, data: Partial<BattlePokemonStatus>): BattlePokemonStatus => {
    const current = statuses.get(id);
    if (!current) {
      throw new Error(`status ${id} not found`);
    }
    const updated = toStatus(current, data);
    statuses.set(id, updated);
    return updated;
  };

  const battleRepository: IBattleRepository = {
    findById: () => Promise.resolve(battle),
    create: () => Promise.reject(new Error('not supported')),
    update: (_id, data) => Promise.resolve(saveBattle(data)),
    findBattlePokemonStatusByBattleId: () => Promise.resolve([...statuses.values()]),
    createBattlePokemonStatus: () => Promise.reject(new Error('not supported')),
    updateBattlePokemonStatus: (id, data) => Promise.resolve(saveStatus(id, data)),
    patchVolatileState: (id, patch: StatePatch<VolatileState>) =>
      Promise.resolve(
        saveStatus(id, {
          volatileState: updateVolatileState(statuses.get(id)!.volatileState, patch),
        }),
      ),
    patchPersistentState: (id, patch: StatePatch<PersistentPokemonState>) =>
      Promise.resolve(
        saveStatus(id, {
          persistentState: updatePersistentPokemonState(statuses.get(id)!.persistentState, patch),
        }),
      ),
    patchSideConditions: (_id, trainerId, patch: StatePatch<SideConditions>) =>
      Promise.resolve(
        saveBattle({ sideState: updateSideConditions(battle.sideState, trainerId, patch) }),
      ),
    patchGlobalFieldState: (_id, patch: StatePatch<GlobalFieldState>) =>
      Promise.resolve(saveBattle({ sideState: updateGlobalFieldState(battle.sideState, patch) })),
    findActivePokemonByBattleIdAndTrainerId: (_id, trainerId) =>
      Promise.resolve(
        [...statuses.values()].find(s => s.trainerId === trainerId && s.isActive) ?? null,
      ),
    findBattlePokemonStatusById: id => Promise.resolve(statuses.get(id) ?? null),
    findBattlePokemonMovesByBattlePokemonStatusId: statusId =>
      Promise.resolve([...pokemonMoves.values()].filter(m => m.battlePokemonStatusId === statusId)),
    createBattlePokemonMove: () => Promise.reject(new Error('not supported')),
    updateBattlePokemonMove: (id, data) => {
      const current = pokemonMoves.get(id)!;
      const updated = new BattlePokemonMove(
        id,
        current.battlePokemonStatusId,
        data.moveId ?? current.moveId,
        data.currentPp,
        data.maxPp ?? current.maxPp,
      );
      pokemonMoves.set(id, updated);
      return Promise.resolve(updated);
    },
    findBattlePokemonMoveById: id => Promise.resolve(pokemonMoves.get(id) ?? null),
  };
  const trainedPokemonRepository: ITrainedPokemonRepository = {
    findById: id => Promise.resolve(trainedPokemons.get(id) ?? null),
    findByTrainerId: trainerId =>
      Promise.resolve([...trainedPokemons.values()].filter(p => p.trainerId === trainerId)),
  };
  const moveRepository: IMoveRepository = {
    findById: id => Promise.resolve(options.moves.find(m => m.id === id) ?? null),
    findByPokemonId: () => Promise.resolve([]),
    findByName: name => Promise.resolve(options.moves.find(m => m.name === name) ?? null),
  };
  const typeChart = new Map<string, number>(
    [...DEFAULT_TYPE_CHART, ...(options.typeChart ?? [])].map(([from, to, value]) => [
      `${typeOf(from).id}-${typeOf(to).id}`,
      value,
    ]),
  );
  const typeEffectivenessRepository: ITypeEffectivenessRepository = {
    getTypeEffectivenessMap: () => Promise.resolve(typeChart),
    findTypeByName: name => Promise.resolve(typeOf(name)),
  };

  const moveExecutor = new MoveExecutorService(
    battleRepository,
    trainedPokemonRepository,
    moveRepository,
    typeEffectivenessRepository,
    options.criticalHitRandom ?? NO_CRITICAL_HIT_RANDOM,
  );
  const switcher = new PokemonSwitcherService(
    battleRepository,
    trainedPokemonRepository,
    typeEffectivenessRepository,
  );
  const statusProcessor = new StatusConditionProcessorService(
    battleRepository,
    trainedPokemonRepository,
  );
  const useCase = new ExecuteTurnUseCase(
    battleRepository,
    new ActionOrderDeterminerService(moveRepository, trainedPokemonRepository),
    new WinnerCheckerService(battleRepository),
    statusProcessor,
    switcher,
    moveExecutor,
  );

  /** 1 ターン進める（技の ID か、交代先の TrainedPokemon の ID） */
  const runTurn = (
    action1: { moveId?: number; switchPokemonId?: number },
    action2: { moveId?: number; switchPokemonId?: number },
  ) =>
    useCase.execute({
      battleId: 1,
      trainer1Action: { trainerId: 1, ...action1 },
      trainer2Action: { trainerId: 2, ...action2 },
    });

  return {
    battleRepository,
    trainedPokemonRepository,
    moveExecutor,
    switcher,
    statusProcessor,
    useCase,
    runTurn,
    status: (id: number): BattlePokemonStatus => statuses.get(id)!,
    battle: (): Battle => battle,
    active: (trainerId: number): BattlePokemonStatus | undefined =>
      [...statuses.values()].find(s => s.trainerId === trainerId && s.isActive),
  };
};
