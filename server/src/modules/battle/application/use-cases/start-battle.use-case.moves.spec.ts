import { ValidationException } from '@/shared/domain/exceptions';
import { IBattleRepository } from '../../domain/battle.repository.interface';
import { Battle, BattleStatus, Field, Weather } from '../../domain/entities/battle.entity';
import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import { Nature } from '../../domain/logic/stat-calculator';
import {
  ITeamRepository,
  ITrainedPokemonRepository,
  TeamMemberInfo,
} from '@/modules/trainer/domain/trainer.repository.interface';
import { TrainedPokemon, Gender } from '@/modules/trainer/domain/entities/trained-pokemon.entity';
import { IMoveRepository } from '@/modules/pokemon/domain/pokemon.repository.interface';
import { Pokemon } from '@/modules/pokemon/domain/entities/pokemon.entity';
import { Move, MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { typeOf } from '../__tests__/battle-engine-harness';
import { UNRESTRICTED_REGULATION } from '../__tests__/unrestricted-regulation';
import { StartBattleUseCase } from './start-battle.use-case';

describe('StartBattleUseCase - 育成ポケモンが選んだ技', () => {
  const TRAINER1_ID = 1;
  const TRAINER2_ID = 2;
  const TEAM1_ID = 10;
  const TEAM2_ID = 20;
  const BATTLE_ID = 1;

  /** 技（ID と PP だけを見る） */
  const moveOf = (id: number, pp: number): Move =>
    new Move(
      id,
      `技${id}`,
      `Move${id}`,
      typeOf('ノーマル'),
      MoveCategory.Physical,
      50,
      100,
      pp,
      0,
      null,
    );

  /** テストで使う技（ID → 技） */
  const MOVES = new Map([11, 12, 13, 14, 15, 21, 22].map(id => [id, moveOf(id, id)]));

  /** 種族の ID → 覚える技の ID（findByPokemonId は、このうち前の 2 つを返す） */
  const LEARNSETS: ReadonlyMap<number, readonly number[]> = new Map([
    [1, [11, 12, 13, 14, 15]],
    [2, [21, 22]],
    [3, [21, 22]],
  ]);

  /**
   * 手持ちの 1 体（育成ポケモンと BattlePokemonStatus の ID は同じ。種族の ID は pokemonId）
   */
  const memberOf = (
    teamId: number,
    id: number,
    position: number,
    pokemonId: number,
    moveIds: readonly number[] = [],
  ): TeamMemberInfo => ({
    id,
    teamId,
    position,
    trainedPokemon: new TrainedPokemon(
      id,
      teamId === TEAM1_ID ? TRAINER1_ID : TRAINER2_ID,
      new Pokemon(
        pokemonId,
        id,
        `ポケモン${pokemonId}`,
        'Test',
        typeOf('ノーマル'),
        null,
        100,
        100,
        100,
        100,
        100,
        100,
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
      null,
      moveIds,
    ),
  });

  /** 技を選んでいない 3 体の手持ち */
  const plainTeam = (teamId: number): TeamMemberInfo[] => [
    memberOf(teamId, teamId + 1, 1, 2),
    memberOf(teamId, teamId + 2, 2, 2),
    memberOf(teamId, teamId + 3, 3, 3),
  ];

  const statusOf = (id: number, trainerId: number): BattlePokemonStatus =>
    new BattlePokemonStatus(
      id,
      BATTLE_ID,
      id,
      trainerId,
      false,
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
    );

  const createUseCase = (teams: Readonly<Record<number, TeamMemberInfo[]>>) => {
    const battle = new Battle(
      BATTLE_ID,
      TRAINER1_ID,
      TRAINER2_ID,
      TEAM1_ID,
      TEAM2_ID,
      1,
      Weather.None,
      Field.None,
      BattleStatus.Active,
      null,
    );
    const battleRepository = {
      findById: jest.fn().mockResolvedValue(battle),
      create: jest.fn().mockResolvedValue(battle),
      update: jest.fn(),
      findBattlePokemonStatusByBattleId: jest.fn().mockResolvedValue([]),
      createBattlePokemonStatus: jest.fn(data =>
        Promise.resolve(statusOf(data.trainedPokemonId, data.trainerId)),
      ),
      updateBattlePokemonStatus: jest.fn(),
      findActivePokemonByBattleIdAndTrainerId: jest.fn(),
      findBattlePokemonStatusById: jest.fn().mockResolvedValue(null),
      findBattlePokemonMovesByBattlePokemonStatusId: jest.fn(),
      createBattlePokemonMove: jest.fn(),
      updateBattlePokemonMove: jest.fn(),
      findBattlePokemonMoveById: jest.fn(),
      patchVolatileState: jest.fn(),
      patchPersistentState: jest.fn(),
      patchSideConditions: jest.fn(),
      patchGlobalFieldState: jest.fn(),
    } satisfies jest.Mocked<IBattleRepository>;
    const teamRepository: ITeamRepository = {
      findMembersByTeamId: teamId => Promise.resolve(teams[teamId] ?? []),
    };
    const moveRepository = {
      findById: jest.fn((id: number) => Promise.resolve(MOVES.get(id) ?? null)),
      findByPokemonId: jest.fn((pokemonId: number) =>
        Promise.resolve(
          (LEARNSETS.get(pokemonId) ?? []).slice(0, 2).flatMap(id => MOVES.get(id) ?? []),
        ),
      ),
      findLearnableMoveIds: jest.fn((pokemonId: number) =>
        Promise.resolve([...(LEARNSETS.get(pokemonId) ?? [])]),
      ),
    } satisfies jest.Mocked<IMoveRepository>;
    const trainedPokemonRepository: ITrainedPokemonRepository = {
      findById: () => Promise.resolve(null),
      findByTrainerId: () => Promise.resolve([]),
    };
    const useCase = new StartBattleUseCase(
      battleRepository,
      teamRepository,
      moveRepository,
      trainedPokemonRepository,
      UNRESTRICTED_REGULATION,
    );
    return {
      start: () => useCase.execute(TRAINER1_ID, TRAINER2_ID, TEAM1_ID, TEAM2_ID),
      battleRepository,
      moveRepository,
    };
  };

  /** BattlePokemonStatus ごとに作った技（作った順） */
  const createdMovesOf = (
    battleRepository: ReturnType<typeof createUseCase>['battleRepository'],
    statusId: number,
  ) =>
    battleRepository.createBattlePokemonMove.mock.calls
      .map(([data]) => data)
      .filter(data => data.battlePokemonStatusId === statusId);

  /** start が投げた例外（投げなければ undefined） */
  const errorOf = async (start: () => Promise<unknown>): Promise<unknown> =>
    start().then(
      () => undefined,
      (error: unknown) => error,
    );

  it('選んだ技があれば、その技を slot の順に、技の PP でバトル中の技にする', async () => {
    // Arrange
    const engine = createUseCase({
      [TEAM1_ID]: [memberOf(TEAM1_ID, 11, 1, 1, [15, 13, 11, 14]), ...plainTeam(TEAM1_ID).slice(1)],
      [TEAM2_ID]: plainTeam(TEAM2_ID),
    });

    // Act
    await engine.start();

    // Assert
    expect(createdMovesOf(engine.battleRepository, 11)).toEqual([
      { battlePokemonStatusId: 11, moveId: 15, currentPp: 15, maxPp: 15 },
      { battlePokemonStatusId: 11, moveId: 13, currentPp: 13, maxPp: 13 },
      { battlePokemonStatusId: 11, moveId: 11, currentPp: 11, maxPp: 11 },
      { battlePokemonStatusId: 11, moveId: 14, currentPp: 14, maxPp: 14 },
    ]);
  });

  it('選んだ技があるポケモンは、種族の覚える技から技を作らない', async () => {
    // Arrange: 種族 1 は、選んだ技のあるポケモンだけ
    const engine = createUseCase({
      [TEAM1_ID]: [memberOf(TEAM1_ID, 11, 1, 1, [12]), ...plainTeam(TEAM1_ID).slice(1)],
      [TEAM2_ID]: plainTeam(TEAM2_ID),
    });

    // Act
    await engine.start();

    // Assert
    expect(engine.moveRepository.findByPokemonId).not.toHaveBeenCalledWith(1);
    expect(createdMovesOf(engine.battleRepository, 11)).toEqual([
      { battlePokemonStatusId: 11, moveId: 12, currentPp: 12, maxPp: 12 },
    ]);
  });

  it('技を選んでいないポケモンは、今までどおり種族の覚える技（findByPokemonId）から技を作る', async () => {
    // Arrange
    const engine = createUseCase({
      [TEAM1_ID]: plainTeam(TEAM1_ID),
      [TEAM2_ID]: plainTeam(TEAM2_ID),
    });

    // Act
    await engine.start();

    // Assert
    expect(createdMovesOf(engine.battleRepository, TEAM1_ID + 1)).toEqual([
      { battlePokemonStatusId: TEAM1_ID + 1, moveId: 21, currentPp: 21, maxPp: 21 },
      { battlePokemonStatusId: TEAM1_ID + 1, moveId: 22, currentPp: 22, maxPp: 22 },
    ]);
  });

  it('どのポケモンも技を選んでいなければ、覚える技の一覧を読まない', async () => {
    // Arrange
    const engine = createUseCase({
      [TEAM1_ID]: plainTeam(TEAM1_ID),
      [TEAM2_ID]: plainTeam(TEAM2_ID),
    });

    // Act
    await engine.start();

    // Assert
    expect(engine.moveRepository.findLearnableMoveIds).not.toHaveBeenCalled();
  });

  it('種族が覚えない技を選んだポケモンがいれば、何も書き込まずに ValidationException で弾く', async () => {
    // Arrange: 種族 2 は技 11 を覚えない
    const engine = createUseCase({
      [TEAM1_ID]: plainTeam(TEAM1_ID),
      [TEAM2_ID]: [memberOf(TEAM2_ID, 21, 1, 2, [21, 11]), ...plainTeam(TEAM2_ID).slice(1)],
    });

    // Act
    const error = await errorOf(engine.start);

    // Assert
    expect(error).toBeInstanceOf(ValidationException);
    expect(error).toMatchObject({
      field: 'team2Id',
      message: 'ポケモン2 cannot learn the move with ID 11',
    });
    expect(engine.battleRepository.create).not.toHaveBeenCalled();
    expect(engine.battleRepository.createBattlePokemonStatus).not.toHaveBeenCalled();
    expect(engine.battleRepository.createBattlePokemonMove).not.toHaveBeenCalled();
  });

  it('覚える技の一覧は、同じ種族について 1 回だけ読む', async () => {
    // Arrange: 種族 2 で技を選んだポケモンが両チームにいる
    const engine = createUseCase({
      [TEAM1_ID]: [memberOf(TEAM1_ID, 11, 1, 2, [21]), ...plainTeam(TEAM1_ID).slice(1)],
      [TEAM2_ID]: [memberOf(TEAM2_ID, 21, 1, 2, [22]), ...plainTeam(TEAM2_ID).slice(1)],
    });

    // Act
    await engine.start();

    // Assert
    expect(engine.moveRepository.findLearnableMoveIds).toHaveBeenCalledTimes(1);
    expect(engine.moveRepository.findLearnableMoveIds).toHaveBeenCalledWith(2);
  });
});
