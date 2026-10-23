import { ValidationException } from '@/shared/domain/exceptions';
import { IBattleRepository } from '../../domain/battle.repository.interface';
import { Nature } from '../../domain/logic/stat-calculator';
import {
  ITeamRepository,
  ITrainedPokemonRepository,
  TeamMemberInfo,
} from '@/modules/trainer/domain/trainer.repository.interface';
import { TrainedPokemon, Gender } from '@/modules/trainer/domain/entities/trained-pokemon.entity';
import { IMoveRepository } from '@/modules/pokemon/domain/pokemon.repository.interface';
import { Pokemon } from '@/modules/pokemon/domain/entities/pokemon.entity';
import { typeOf } from '../__tests__/battle-engine-harness';
import { StartBattleUseCase } from './start-battle.use-case';

describe('StartBattleUseCase - 手持ちのルール（チャンピオンズのシングル）', () => {
  const TRAINER1_ID = 1;
  const TRAINER2_ID = 2;
  const TEAM1_ID = 10;
  const TEAM2_ID = 20;

  /**
   * 手持ちの 1 体（全国図鑑の番号は省略すると id と同じ）
   */
  const memberOf = (
    teamId: number,
    id: number,
    position: number,
    options: { nationalDex?: number; heldItem?: string } = {},
  ): TeamMemberInfo => ({
    id,
    teamId,
    position,
    trainedPokemon: new TrainedPokemon(
      id,
      teamId === TEAM1_ID ? TRAINER1_ID : TRAINER2_ID,
      new Pokemon(
        id,
        options.nationalDex ?? id,
        'テスト',
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
      options.heldItem ?? null,
    ),
  });

  /** ルールに合う 3 体の手持ち */
  const validTeam = (teamId: number): TeamMemberInfo[] => [
    memberOf(teamId, teamId + 1, 1),
    memberOf(teamId, teamId + 2, 2),
    memberOf(teamId, teamId + 3, 3),
  ];

  /**
   * 書き込みのメソッドをすべて jest.fn にしたリポジトリで、ユースケースを作る
   */
  const createUseCase = (teams: Readonly<Record<number, TeamMemberInfo[]>>) => {
    const battleRepository = {
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findBattlePokemonStatusByBattleId: jest.fn(),
      createBattlePokemonStatus: jest.fn(),
      updateBattlePokemonStatus: jest.fn(),
      findActivePokemonByBattleIdAndTrainerId: jest.fn(),
      findBattlePokemonStatusById: jest.fn(),
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
    const moveRepository: IMoveRepository = {
      findById: () => Promise.resolve(null),
      findByPokemonId: () => Promise.resolve([]),
    };
    const trainedPokemonRepository: ITrainedPokemonRepository = {
      findById: () => Promise.resolve(null),
      findByTrainerId: () => Promise.resolve([]),
    };
    const useCase = new StartBattleUseCase(
      battleRepository,
      teamRepository,
      moveRepository,
      trainedPokemonRepository,
    );
    return {
      start: () => useCase.execute(TRAINER1_ID, TRAINER2_ID, TEAM1_ID, TEAM2_ID),
      battleRepository,
    };
  };

  /** start が投げた例外（投げなければ undefined） */
  const errorOf = async (start: () => Promise<unknown>): Promise<unknown> =>
    start().then(
      () => undefined,
      (error: unknown) => error,
    );

  it('チーム 1 が 2 体なら、何も書き込まずに team1Id の ValidationException で弾く', async () => {
    // Arrange
    const engine = createUseCase({
      [TEAM1_ID]: validTeam(TEAM1_ID).slice(0, 2),
      [TEAM2_ID]: validTeam(TEAM2_ID),
    });

    // Act
    const error = await errorOf(engine.start);

    // Assert
    expect(error).toBeInstanceOf(ValidationException);
    expect(error).toMatchObject({
      field: 'team1Id',
      message: 'A team must have 3 to 6 pokemon. Got: 2',
    });
    expect(engine.battleRepository.create).not.toHaveBeenCalled();
    expect(engine.battleRepository.createBattlePokemonStatus).not.toHaveBeenCalled();
  });

  it('チーム 2 が 7 体なら、何も書き込まずに team2Id の ValidationException で弾く', async () => {
    // Arrange
    const engine = createUseCase({
      [TEAM1_ID]: validTeam(TEAM1_ID),
      [TEAM2_ID]: Array.from({ length: 7 }, (_, index) =>
        memberOf(TEAM2_ID, TEAM2_ID + index + 1, index + 1),
      ),
    });

    // Act
    const error = await errorOf(engine.start);

    // Assert
    expect(error).toBeInstanceOf(ValidationException);
    expect(error).toMatchObject({ field: 'team2Id' });
    expect(engine.battleRepository.create).not.toHaveBeenCalled();
  });

  it('同じ持ち物を 2 体が持つチームなら、何も書き込まずに ValidationException で弾く', async () => {
    // Arrange
    const engine = createUseCase({
      [TEAM1_ID]: validTeam(TEAM1_ID),
      [TEAM2_ID]: [
        memberOf(TEAM2_ID, 21, 1, { heldItem: 'たべのこし' }),
        memberOf(TEAM2_ID, 22, 2),
        memberOf(TEAM2_ID, 23, 3, { heldItem: 'たべのこし' }),
      ],
    });

    // Act
    const error = await errorOf(engine.start);

    // Assert
    expect(error).toBeInstanceOf(ValidationException);
    expect(error).toMatchObject({
      field: 'team2Id',
      message: 'Two pokemon in a team cannot hold the same item: たべのこし',
    });
    expect(engine.battleRepository.create).not.toHaveBeenCalled();
  });

  it('全国図鑑の番号が同じポケモンが 2 体いるチームなら、何も書き込まずに ValidationException で弾く', async () => {
    // Arrange
    const engine = createUseCase({
      [TEAM1_ID]: [
        memberOf(TEAM1_ID, 11, 1, { nationalDex: 479 }),
        memberOf(TEAM1_ID, 12, 2, { nationalDex: 479 }),
        memberOf(TEAM1_ID, 13, 3),
      ],
      [TEAM2_ID]: validTeam(TEAM2_ID),
    });

    // Act
    const error = await errorOf(engine.start);

    // Assert
    expect(error).toBeInstanceOf(ValidationException);
    expect(error).toMatchObject({
      field: 'team1Id',
      message: 'A team cannot have two pokemon with the same National Pokédex number: 479',
    });
    expect(engine.battleRepository.create).not.toHaveBeenCalled();
  });
});
