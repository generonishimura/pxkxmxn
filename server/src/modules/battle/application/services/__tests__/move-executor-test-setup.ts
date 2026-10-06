import { MoveExecutorService } from '../move-executor.service';
import { Battle, BattleStatus } from '../../../domain/entities/battle.entity';
import { BattlePokemonStatus } from '../../../domain/entities/battle-pokemon-status.entity';
import { BattlePokemonMove } from '../../../domain/entities/battle-pokemon-move.entity';
import { IBattleRepository } from '../../../domain/battle.repository.interface';
import { DamageCalculator } from '../../../domain/logic/damage-calculator';
import { AccuracyCalculator } from '../../../domain/logic/accuracy-calculator';
import { Nature } from '../../../domain/logic/stat-calculator';
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
  AbilityTrigger,
  AbilityCategory,
} from '@/modules/pokemon/domain/entities/ability.entity';
import { MoveRegistry } from '@/modules/pokemon/domain/moves/move-registry';
import { IMoveEffect } from '@/modules/pokemon/domain/moves/move-effect.interface';

/**
 * MoveExecutorService のイベントフックのテスト用セットアップ
 * 攻撃側（ID 1）と防御側（ID 2）の状態をメモリ上で持ち、リポジトリの更新を反映する
 */
export const ATTACKER_ID = 1;
export const DEFENDER_ID = 2;
export const NORMAL = new Type(1, 'ノーマル', 'Normal');

export const createStatus = (id: number, data: Partial<BattlePokemonStatus> = {}) =>
  withChanges(
    new BattlePokemonStatus(id, 1, id, id, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null),
    data,
  );

export const withChanges = (
  status: BattlePokemonStatus,
  data: Partial<BattlePokemonStatus>,
): BattlePokemonStatus => {
  const merged = { ...status, ...data };
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
  );
};

export const createTrainedPokemon = (
  id: number,
  abilityName?: string,
  types: { primary: Type; secondary?: Type | null } = { primary: NORMAL },
): TrainedPokemon =>
  new TrainedPokemon(
    id,
    id,
    new Pokemon(
      id,
      id,
      'テスト',
      'Test',
      types.primary,
      types.secondary ?? null,
      100,
      100,
      100,
      100,
      100,
      100,
    ),
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

export const createMove = (
  name: string,
  category: MoveCategory = MoveCategory.Physical,
  power: number | null = 80,
  priority = 0,
): Move => new Move(1, name, 'Test Move', NORMAL, category, power, 100, 10, priority, null);

export interface MoveExecutorSetupOptions {
  move?: Move;
  moveEffect?: IMoveEffect;
  attackerAbility?: string;
  defenderAbility?: string;
  attacker?: Partial<BattlePokemonStatus>;
  defender?: Partial<BattlePokemonStatus>;
  /** ヒットごとのダメージ（配列なら順に返す） */
  damage?: number | number[];
}

export const setupMoveExecutor = (options: MoveExecutorSetupOptions = {}) => {
  const statuses = new Map<number, BattlePokemonStatus>([
    [ATTACKER_ID, createStatus(ATTACKER_ID, options.attacker)],
    [DEFENDER_ID, createStatus(DEFENDER_ID, options.defender)],
  ]);
  const battleRepository: jest.Mocked<IBattleRepository> = {
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findBattlePokemonStatusByBattleId: jest.fn(),
    createBattlePokemonStatus: jest.fn(),
    updateBattlePokemonStatus: jest.fn((id: number, data: Partial<BattlePokemonStatus>) => {
      const current = statuses.get(id);
      if (!current) {
        throw new Error(`status ${id} not found`);
      }
      const updated = withChanges(current, data);
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
    findBattlePokemonMoveById: jest
      .fn()
      .mockResolvedValue(new BattlePokemonMove(1, ATTACKER_ID, 1, 10, 10)),
  };
  const trainedPokemons = new Map<number, TrainedPokemon>([
    [ATTACKER_ID, createTrainedPokemon(ATTACKER_ID, options.attackerAbility)],
    [DEFENDER_ID, createTrainedPokemon(DEFENDER_ID, options.defenderAbility)],
  ]);
  const trainedPokemonRepository: jest.Mocked<ITrainedPokemonRepository> = {
    findById: jest.fn((id: number) => Promise.resolve(trainedPokemons.get(id) ?? null)),
    findByTrainerId: jest.fn(),
  };
  const moveRepository: jest.Mocked<IMoveRepository> = {
    findById: jest.fn().mockResolvedValue(options.move ?? createMove('ほのおのパンチ')),
    findByPokemonId: jest.fn(),
  };
  const typeEffectivenessRepository: jest.Mocked<ITypeEffectivenessRepository> = {
    getTypeEffectivenessMap: jest.fn().mockResolvedValue(new Map()),
    findTypeByName: jest.fn().mockResolvedValue(null),
  };

  jest.spyOn(MoveRegistry, 'get').mockReturnValue(options.moveEffect);
  const checkHit = jest.spyOn(AccuracyCalculator, 'checkHit').mockReturnValue(true);
  const damages = Array.isArray(options.damage) ? [...options.damage] : undefined;
  const calculate = jest
    .spyOn(DamageCalculator, 'calculate')
    .mockImplementation(() =>
      Promise.resolve(damages ? (damages.shift() ?? 0) : ((options.damage as number) ?? 10)),
    );

  const service = new MoveExecutorService(
    battleRepository,
    trainedPokemonRepository,
    moveRepository,
    typeEffectivenessRepository,
  );
  const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);
  const execute = () =>
    service.executeMove(
      battle,
      ATTACKER_ID,
      1,
      statuses.get(ATTACKER_ID)!,
      statuses.get(DEFENDER_ID)!,
      1,
    );

  return {
    execute,
    statuses,
    calculate,
    checkHit,
    battleRepository,
    trainedPokemonRepository,
    trainedPokemons,
  };
};
