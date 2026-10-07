import { Battle, BattleStatus } from '../../domain/entities/battle.entity';
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
  updateGlobalFieldState,
  updateSideConditions,
} from '../../domain/state/side-state';
import { Nature } from '../../domain/logic/stat-calculator';
import {
  ITeamRepository,
  ITrainedPokemonRepository,
  TeamMemberInfo,
} from '@/modules/trainer/domain/trainer.repository.interface';
import { TrainedPokemon, Gender } from '@/modules/trainer/domain/entities/trained-pokemon.entity';
import { IMoveRepository } from '@/modules/pokemon/domain/pokemon.repository.interface';
import { Pokemon } from '@/modules/pokemon/domain/entities/pokemon.entity';
import {
  Ability,
  AbilityCategory,
  AbilityTrigger,
} from '@/modules/pokemon/domain/entities/ability.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { transformInto } from '@/modules/pokemon/domain/battle-events/transform';
import { setPrimalWeather } from '@/modules/pokemon/domain/battle-events/field-state';
import { findIllusionTarget } from '@/modules/pokemon/domain/battle-events/illusion';
import {
  resolveCurrentAbilityName,
  setAbility,
} from '@/modules/pokemon/domain/battle-events/ability-change';
import { Weather } from '../../domain/entities/battle.entity';
import { typeOf } from '../__tests__/battle-engine-harness';
import { StartBattleUseCase } from './start-battle.use-case';

/**
 * 先発のポケモン 1 匹分（トレーナー 1 か 2。position 1 が先発）
 */
interface LeadSpec {
  readonly id: number;
  readonly trainerId: 1 | 2;
  readonly position: number;
  readonly ability?: string;
  readonly nationalDex?: number;
  /** 種族値 [HP, 攻撃, 防御, 特攻, 特防, 素早さ]（省略するとすべて 100） */
  readonly baseStats?: readonly [number, number, number, number, number, number];
}

const toTrainedPokemon = (spec: LeadSpec): TrainedPokemon => {
  const [hp, attack, defense, specialAttack, specialDefense, speed] = spec.baseStats ?? [
    100, 100, 100, 100, 100, 100,
  ];
  return new TrainedPokemon(
    spec.id,
    spec.trainerId,
    new Pokemon(
      spec.id,
      spec.nationalDex ?? spec.id,
      'テスト',
      'Test',
      typeOf('ノーマル'),
      null,
      hp,
      attack,
      defense,
      specialAttack,
      specialDefense,
      speed,
    ),
    null,
    50,
    Gender.Male,
    Nature.Hardy,
    spec.ability
      ? new Ability(
          spec.id,
          spec.ability,
          spec.ability,
          'テスト用',
          AbilityTrigger.OnEntry,
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

/**
 * バトル開始（StartBattleUseCase）を、メモリ上のリポジトリで動かす
 * BattlePokemonStatus の ID は作った順に 1 から
 */
const createStartBattle = (specs: readonly LeadSpec[]) => {
  let battle: Battle | undefined;
  const statuses = new Map<number, BattlePokemonStatus>();
  const trainedPokemons = new Map(specs.map(spec => [spec.id, toTrainedPokemon(spec)]));

  const requireBattle = (): Battle => {
    if (!battle) {
      throw new Error('battle not created');
    }
    return battle;
  };
  const saveBattle = (data: Partial<Battle>): Battle => {
    const merged = { ...requireBattle(), ...data };
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
    const merged = { ...statuses.get(id)!, ...data };
    const updated = new BattlePokemonStatus(
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
    statuses.set(id, updated);
    return updated;
  };

  const battleRepository: IBattleRepository = {
    findById: () => Promise.resolve(battle ?? null),
    create: data => {
      battle = new Battle(
        1,
        data.trainer1Id,
        data.trainer2Id,
        data.team1Id,
        data.team2Id,
        1,
        null,
        null,
        BattleStatus.Active,
        null,
        {},
      );
      return Promise.resolve(battle);
    },
    update: (_id, data) => Promise.resolve(saveBattle(data)),
    findBattlePokemonStatusByBattleId: () => Promise.resolve([...statuses.values()]),
    createBattlePokemonStatus: data => {
      const id = statuses.size + 1;
      const created = new BattlePokemonStatus(
        id,
        data.battleId,
        data.trainedPokemonId,
        data.trainerId,
        false,
        data.currentHp,
        data.maxHp,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        StatusCondition.None,
        {},
        {},
      );
      statuses.set(id, created);
      return Promise.resolve(created);
    },
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
        saveBattle({
          sideState: updateSideConditions(requireBattle().sideState, trainerId, patch),
        }),
      ),
    patchGlobalFieldState: (_id, patch: StatePatch<GlobalFieldState>) =>
      Promise.resolve(
        saveBattle({ sideState: updateGlobalFieldState(requireBattle().sideState, patch) }),
      ),
    findActivePokemonByBattleIdAndTrainerId: (_id, trainerId) =>
      Promise.resolve(
        [...statuses.values()].find(s => s.trainerId === trainerId && s.isActive) ?? null,
      ),
    findBattlePokemonStatusById: id => Promise.resolve(statuses.get(id) ?? null),
    findBattlePokemonMovesByBattlePokemonStatusId: () => Promise.resolve<BattlePokemonMove[]>([]),
    createBattlePokemonMove: () => Promise.reject(new Error('not supported')),
    updateBattlePokemonMove: () => Promise.reject(new Error('not supported')),
    findBattlePokemonMoveById: () => Promise.resolve(null),
  };
  const teamRepository: ITeamRepository = {
    findMembersByTeamId: teamId =>
      Promise.resolve(
        specs
          .filter(spec => spec.trainerId === teamId)
          .map(
            (spec): TeamMemberInfo => ({
              id: spec.id,
              teamId,
              trainedPokemon: trainedPokemons.get(spec.id)!,
              position: spec.position,
            }),
          ),
      ),
  };
  const moveRepository: IMoveRepository = {
    findById: () => Promise.resolve(null),
    findByPokemonId: () => Promise.resolve([]),
  };
  const trainedPokemonRepository: ITrainedPokemonRepository = {
    findById: id => Promise.resolve(trainedPokemons.get(id) ?? null),
    findByTrainerId: trainerId =>
      Promise.resolve([...trainedPokemons.values()].filter(p => p.trainerId === trainerId)),
  };
  const useCase = new StartBattleUseCase(
    battleRepository,
    teamRepository,
    moveRepository,
    trainedPokemonRepository,
  );

  return {
    /** バトルを始める（トレーナー 1 と 2、チーム 1 と 2） */
    start: () => useCase.execute(1, 2, 1, 2),
    battle: requireBattle,
    /** TrainedPokemon の ID からバトル中の状態を引く */
    statusOf: (trainedPokemonId: number): BattlePokemonStatus =>
      [...statuses.values()].find(s => s.trainedPokemonId === trainedPokemonId)!,
  };
};

describe('StartBattleUseCase - 先発の場に出たときの処理', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('フォルムが変わるポケモンの最大 HP は、既定のフォルムの HP で計算する（DB にメガジガルデが残っていても 50% フォルム）', async () => {
    // Arrange
    const engine = createStartBattle([
      {
        id: 1,
        trainerId: 1,
        position: 1,
        nationalDex: 718,
        baseStats: [216, 70, 91, 216, 85, 100],
      },
      { id: 2, trainerId: 2, position: 1 },
    ]);

    // Act
    await engine.start();

    // Assert: floor((2 * 108 + 31) * 50 / 100) + 50 + 10 = 183
    expect(engine.statusOf(1).maxHp).toBe(183);
    expect(engine.statusOf(1).currentHp).toBe(183);
  });

  /**
   * 相手の場のポケモン（onEntry の中で引く）
   */
  const opponentOf = async (holder: BattlePokemonStatus, ctx: BattleContext) =>
    (await ctx.battleRepository!.findBattlePokemonStatusByBattleId(holder.battleId)).find(
      status => status.trainerId !== holder.trainerId && status.isActive,
    );

  it('トレーナー 1 の先発の onEntry から、トレーナー 2 の先発が見える（かわりもの）', async () => {
    // Arrange
    AbilityRegistry.register('テストのかわりもの', {
      onEntry: async (holder, ctx) => {
        const opponent = ctx ? await opponentOf(holder, ctx) : undefined;
        if (ctx && opponent) {
          await transformInto(holder, opponent, ctx);
        }
      },
    });
    const engine = createStartBattle([
      { id: 1, trainerId: 1, position: 1, ability: 'テストのかわりもの' },
      { id: 2, trainerId: 2, position: 1 },
    ]);

    // Act
    await engine.start();

    // Assert
    expect(engine.statusOf(1).volatileState.transformedIntoStatusId).toBe(engine.statusOf(2).id);
  });

  it('トレーナー 1 の先発のトレースが、トレーナー 2 の先発の特性を写す', async () => {
    // Arrange
    AbilityRegistry.register('テストのトレース', {
      onEntry: async (holder, ctx) => {
        const opponent = ctx ? await opponentOf(holder, ctx) : undefined;
        const name = ctx && opponent ? await resolveCurrentAbilityName(opponent, ctx) : undefined;
        if (ctx && name) {
          await setAbility(holder, name, ctx);
        }
      },
    });
    const engine = createStartBattle([
      { id: 1, trainerId: 1, position: 1, ability: 'テストのトレース' },
      { id: 2, trainerId: 2, position: 1, ability: 'ふみん' },
    ]);

    // Act
    await engine.start();

    // Assert
    expect(engine.statusOf(1).volatileState.abilityOverride).toBe('ふみん');
  });

  it('先発のイリュージョンは、あとに作る手持ちのポケモンに化けられる', async () => {
    // Arrange
    AbilityRegistry.register('テストのイリュージョン', {
      onEntry: async (holder, ctx) => {
        const statuses = await ctx!.battleRepository!.findBattlePokemonStatusByBattleId(
          holder.battleId,
        );
        const target = findIllusionTarget(statuses, holder);
        if (target) {
          await ctx!.battleRepository!.patchVolatileState(holder.id, {
            illusionStatusId: target.id,
          });
        }
      },
    });
    const engine = createStartBattle([
      { id: 1, trainerId: 1, position: 1, ability: 'テストのイリュージョン' },
      { id: 3, trainerId: 1, position: 2 },
      { id: 2, trainerId: 2, position: 1 },
    ]);

    // Act
    await engine.start();

    // Assert
    expect(engine.statusOf(1).volatileState.illusionStatusId).toBe(engine.statusOf(3).id);
  });

  it('先発の onEntry は、素早さの高い方から呼ぶ', async () => {
    // Arrange
    const order: number[] = [];
    AbilityRegistry.register('テストのいかく', {
      onEntry: holder => {
        order.push(holder.trainedPokemonId);
      },
    });
    const engine = createStartBattle([
      {
        id: 1,
        trainerId: 1,
        position: 1,
        ability: 'テストのいかく',
        baseStats: [100, 100, 100, 100, 100, 50],
      },
      {
        id: 2,
        trainerId: 2,
        position: 1,
        ability: 'テストのいかく',
        baseStats: [100, 100, 100, 100, 100, 150],
      },
    ]);

    // Act
    await engine.start();

    // Assert
    expect(order).toEqual([2, 1]);
  });

  it('相手の先発がかがくへんかガスなら、素早い先発のゲンシ天候は始まらない', async () => {
    // Arrange
    AbilityRegistry.register('テストのはじまりのうみ', {
      primalWeather: 'heavyRain',
      onEntry: async (holder, ctx) => {
        if (ctx) {
          await setPrimalWeather(ctx, holder, 'heavyRain');
        }
      },
    });
    const engine = createStartBattle([
      {
        id: 1,
        trainerId: 1,
        position: 1,
        ability: 'テストのはじまりのうみ',
        baseStats: [100, 100, 100, 100, 100, 150],
      },
      {
        id: 2,
        trainerId: 2,
        position: 1,
        ability: 'かがくへんかガス',
        baseStats: [100, 100, 100, 100, 100, 50],
      },
    ]);

    // Act
    await engine.start();

    // Assert
    expect(engine.battle().weather ?? Weather.None).toBe(Weather.None);
    expect(engine.battle().sideState.global?.primalWeather).toBeUndefined();
  });
});
