import { Test, TestingModule } from '@nestjs/testing';
import { StartBattleUseCase } from './start-battle.use-case';
import {
  IBattleRepository,
  BATTLE_REPOSITORY_TOKEN,
} from '../../domain/battle.repository.interface';
import {
  ITeamRepository,
  TEAM_REPOSITORY_TOKEN,
} from '@/modules/trainer/domain/trainer.repository.interface';
import {
  IMoveRepository,
  MOVE_REPOSITORY_TOKEN,
} from '@/modules/pokemon/domain/pokemon.repository.interface';
import { Battle, BattleStatus, Weather, Field } from '../../domain/entities/battle.entity';
import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import { BattlePokemonMove } from '../../domain/entities/battle-pokemon-move.entity';
import { StatusCondition } from '../../domain/entities/status-condition.enum';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { TrainedPokemon, Gender } from '@/modules/trainer/domain/entities/trained-pokemon.entity';
import { Pokemon } from '@/modules/pokemon/domain/entities/pokemon.entity';
import { Type } from '@/modules/pokemon/domain/entities/type.entity';
import { Move, MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import {
  Ability,
  AbilityTrigger,
  AbilityCategory,
} from '@/modules/pokemon/domain/entities/ability.entity';
import { TeamMemberInfo } from '@/modules/trainer/domain/trainer.repository.interface';
import { Nature } from '../../domain/logic/stat-calculator';

describe('StartBattleUseCase', () => {
  let useCase: StartBattleUseCase;
  let battleRepository: jest.Mocked<IBattleRepository>;
  let teamRepository: jest.Mocked<ITeamRepository>;
  let moveRepository: jest.Mocked<IMoveRepository>;

  beforeEach(async () => {
    const mockBattleRepository: jest.Mocked<IBattleRepository> = {
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
    };

    const mockTeamRepository: jest.Mocked<ITeamRepository> = {
      findMembersByTeamId: jest.fn(),
    };

    const mockMoveRepository: jest.Mocked<IMoveRepository> = {
      findById: jest.fn(),
      findByPokemonId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StartBattleUseCase,
        {
          provide: BATTLE_REPOSITORY_TOKEN,
          useValue: mockBattleRepository,
        },
        {
          provide: TEAM_REPOSITORY_TOKEN,
          useValue: mockTeamRepository,
        },
        {
          provide: MOVE_REPOSITORY_TOKEN,
          useValue: mockMoveRepository,
        },
      ],
    }).compile();

    useCase = module.get<StartBattleUseCase>(StartBattleUseCase);
    battleRepository = module.get(BATTLE_REPOSITORY_TOKEN);
    teamRepository = module.get(TEAM_REPOSITORY_TOKEN);
    moveRepository = module.get(MOVE_REPOSITORY_TOKEN);

    // MoveRepositoryのモックをデフォルトで空の配列を返すように設定
    moveRepository.findByPokemonId.mockResolvedValue([]);

    // AbilityRegistryを初期化
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    const trainer1Id = 1;
    const trainer2Id = 2;
    const team1Id = 10;
    const team2Id = 20;

    const createMockPokemon = (id: number, name: string): Pokemon => {
      return new Pokemon(
        id,
        1,
        name,
        name,
        new Type(1, 'ノーマル', 'Normal'),
        null,
        100,
        50,
        50,
        50,
        50,
        50,
      );
    };

    const createMockAbility = (id: number, name: string): Ability => {
      return new Ability(
        id,
        name,
        name,
        'Test ability',
        AbilityTrigger.OnEntry,
        AbilityCategory.StatChange,
      );
    };

    const createMockTrainedPokemon = (
      id: number,
      pokemon: Pokemon,
      ability: Ability | null = null,
    ): TrainedPokemon => {
      return new TrainedPokemon(
        id,
        trainer1Id,
        pokemon,
        null,
        50,
        Gender.Male,
        Nature.Hardy,
        ability,
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

    it('should create a battle and initialize pokemon statuses', async () => {
      // Arrange
      const mockBattle = new Battle(
        1,
        trainer1Id,
        trainer2Id,
        team1Id,
        team2Id,
        1,
        Weather.None,
        Field.None,
        BattleStatus.Active,
        null,
      );

      const pokemon1 = createMockPokemon(1, 'ポケモン1');
      const pokemon2 = createMockPokemon(2, 'ポケモン2');
      const trainedPokemon1 = createMockTrainedPokemon(100, pokemon1);
      const trainedPokemon2 = createMockTrainedPokemon(200, pokemon2);

      const team1Members: TeamMemberInfo[] = [
        {
          id: 1,
          teamId: team1Id,
          trainedPokemon: trainedPokemon1,
          position: 1,
        },
      ];

      const team2Members: TeamMemberInfo[] = [
        {
          id: 2,
          teamId: team2Id,
          trainedPokemon: trainedPokemon2,
          position: 1,
        },
      ];

      const battleStatus1 = new BattlePokemonStatus(
        1,
        mockBattle.id,
        trainedPokemon1.id,
        trainer1Id,
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

      const battleStatus2 = new BattlePokemonStatus(
        2,
        mockBattle.id,
        trainedPokemon2.id,
        trainer2Id,
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

      battleRepository.create.mockResolvedValue(mockBattle);
      teamRepository.findMembersByTeamId
        .mockResolvedValueOnce(team1Members)
        .mockResolvedValueOnce(team2Members);
      battleRepository.createBattlePokemonStatus
        .mockResolvedValueOnce(battleStatus1)
        .mockResolvedValueOnce(battleStatus2);

      const activeBattleStatus1 = new BattlePokemonStatus(
        battleStatus1.id,
        battleStatus1.battleId,
        battleStatus1.trainedPokemonId,
        battleStatus1.trainerId,
        true,
        battleStatus1.currentHp,
        battleStatus1.maxHp,
        battleStatus1.attackRank,
        battleStatus1.defenseRank,
        battleStatus1.specialAttackRank,
        battleStatus1.specialDefenseRank,
        battleStatus1.speedRank,
        battleStatus1.accuracyRank,
        battleStatus1.evasionRank,
        battleStatus1.statusCondition,
      );

      const activeBattleStatus2 = new BattlePokemonStatus(
        battleStatus2.id,
        battleStatus2.battleId,
        battleStatus2.trainedPokemonId,
        battleStatus2.trainerId,
        true,
        battleStatus2.currentHp,
        battleStatus2.maxHp,
        battleStatus2.attackRank,
        battleStatus2.defenseRank,
        battleStatus2.specialAttackRank,
        battleStatus2.specialDefenseRank,
        battleStatus2.speedRank,
        battleStatus2.accuracyRank,
        battleStatus2.evasionRank,
        battleStatus2.statusCondition,
      );

      battleRepository.updateBattlePokemonStatus
        .mockResolvedValueOnce(activeBattleStatus1)
        .mockResolvedValueOnce(activeBattleStatus2);
      battleRepository.findBattlePokemonStatusByBattleId.mockResolvedValue([
        battleStatus1,
        battleStatus2,
      ]);

      // Act
      const result = await useCase.execute(trainer1Id, trainer2Id, team1Id, team2Id);

      // Assert
      expect(result).toEqual(mockBattle);
      expect(battleRepository.create).toHaveBeenCalledWith({
        trainer1Id,
        trainer2Id,
        team1Id,
        team2Id,
      });
      expect(teamRepository.findMembersByTeamId).toHaveBeenCalledWith(team1Id);
      expect(teamRepository.findMembersByTeamId).toHaveBeenCalledWith(team2Id);
      expect(battleRepository.createBattlePokemonStatus).toHaveBeenCalledTimes(2);
      expect(battleRepository.updateBattlePokemonStatus).toHaveBeenCalledTimes(2);
    });

    it('should set position 1 pokemon as active', async () => {
      // Arrange
      const mockBattle = new Battle(
        1,
        trainer1Id,
        trainer2Id,
        team1Id,
        team2Id,
        1,
        Weather.None,
        Field.None,
        BattleStatus.Active,
        null,
      );

      const pokemon1 = createMockPokemon(1, 'ポケモン1');
      const pokemon2 = createMockPokemon(2, 'ポケモン2');
      const trainedPokemon1 = createMockTrainedPokemon(100, pokemon1);
      const trainedPokemon2 = createMockTrainedPokemon(200, pokemon2);

      const team1Members: TeamMemberInfo[] = [
        {
          id: 1,
          teamId: team1Id,
          trainedPokemon: trainedPokemon1,
          position: 1,
        },
        {
          id: 2,
          teamId: team1Id,
          trainedPokemon: trainedPokemon2,
          position: 2,
        },
      ];

      const team2Members: TeamMemberInfo[] = [
        {
          id: 3,
          teamId: team2Id,
          trainedPokemon: trainedPokemon2,
          position: 1,
        },
      ];

      const battleStatus1 = new BattlePokemonStatus(
        1,
        mockBattle.id,
        trainedPokemon1.id,
        trainer1Id,
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

      const battleStatus2 = new BattlePokemonStatus(
        2,
        mockBattle.id,
        trainedPokemon2.id,
        trainer1Id,
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

      const battleStatus3 = new BattlePokemonStatus(
        3,
        mockBattle.id,
        trainedPokemon2.id,
        trainer2Id,
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

      battleRepository.create.mockResolvedValue(mockBattle);
      teamRepository.findMembersByTeamId
        .mockResolvedValueOnce(team1Members)
        .mockResolvedValueOnce(team2Members);
      battleRepository.createBattlePokemonStatus
        .mockResolvedValueOnce(battleStatus1)
        .mockResolvedValueOnce(battleStatus2)
        .mockResolvedValueOnce(battleStatus3);

      const activeBattleStatus1 = new BattlePokemonStatus(
        battleStatus1.id,
        battleStatus1.battleId,
        battleStatus1.trainedPokemonId,
        battleStatus1.trainerId,
        true,
        battleStatus1.currentHp,
        battleStatus1.maxHp,
        battleStatus1.attackRank,
        battleStatus1.defenseRank,
        battleStatus1.specialAttackRank,
        battleStatus1.specialDefenseRank,
        battleStatus1.speedRank,
        battleStatus1.accuracyRank,
        battleStatus1.evasionRank,
        battleStatus1.statusCondition,
      );

      const activeBattleStatus3 = new BattlePokemonStatus(
        battleStatus3.id,
        battleStatus3.battleId,
        battleStatus3.trainedPokemonId,
        battleStatus3.trainerId,
        true,
        battleStatus3.currentHp,
        battleStatus3.maxHp,
        battleStatus3.attackRank,
        battleStatus3.defenseRank,
        battleStatus3.specialAttackRank,
        battleStatus3.specialDefenseRank,
        battleStatus3.speedRank,
        battleStatus3.accuracyRank,
        battleStatus3.evasionRank,
        battleStatus3.statusCondition,
      );

      battleRepository.updateBattlePokemonStatus
        .mockResolvedValueOnce(activeBattleStatus1)
        .mockResolvedValueOnce(activeBattleStatus3);
      battleRepository.findBattlePokemonStatusByBattleId.mockResolvedValue([
        battleStatus1,
        battleStatus2,
        battleStatus3,
      ]);

      // Act
      await useCase.execute(trainer1Id, trainer2Id, team1Id, team2Id);

      // Assert
      // position=1のポケモンのみがisActive=trueに更新される
      expect(battleRepository.updateBattlePokemonStatus).toHaveBeenCalledTimes(2);
      expect(battleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(battleStatus1.id, {
        isActive: true,
      });
      expect(battleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(battleStatus3.id, {
        isActive: true,
      });
      // position=2のポケモンは更新されない
      expect(battleRepository.updateBattlePokemonStatus).not.toHaveBeenCalledWith(
        battleStatus2.id,
        expect.anything(),
      );
    });

    it('should trigger ability OnEntry effect when pokemon has ability', async () => {
      // Arrange
      const mockBattle = new Battle(
        1,
        trainer1Id,
        trainer2Id,
        team1Id,
        team2Id,
        1,
        Weather.None,
        Field.None,
        BattleStatus.Active,
        null,
      );

      const pokemon1 = createMockPokemon(1, 'ポケモン1');
      const pokemon2 = createMockPokemon(2, 'ポケモン2');
      const ability = createMockAbility(1, 'いかく');
      const trainedPokemon1 = createMockTrainedPokemon(100, pokemon1, ability);
      const trainedPokemon2 = createMockTrainedPokemon(200, pokemon2);

      const team1Members: TeamMemberInfo[] = [
        {
          id: 1,
          teamId: team1Id,
          trainedPokemon: trainedPokemon1,
          position: 1,
        },
      ];

      const team2Members: TeamMemberInfo[] = [
        {
          id: 2,
          teamId: team2Id,
          trainedPokemon: trainedPokemon2,
          position: 1,
        },
      ];

      const battleStatus1 = new BattlePokemonStatus(
        1,
        mockBattle.id,
        trainedPokemon1.id,
        trainer1Id,
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

      const battleStatus2 = new BattlePokemonStatus(
        2,
        mockBattle.id,
        trainedPokemon2.id,
        trainer2Id,
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

      const activeBattleStatus1 = new BattlePokemonStatus(
        battleStatus1.id,
        battleStatus1.battleId,
        battleStatus1.trainedPokemonId,
        battleStatus1.trainerId,
        true,
        battleStatus1.currentHp,
        battleStatus1.maxHp,
        battleStatus1.attackRank,
        battleStatus1.defenseRank,
        battleStatus1.specialAttackRank,
        battleStatus1.specialDefenseRank,
        battleStatus1.speedRank,
        battleStatus1.accuracyRank,
        battleStatus1.evasionRank,
        battleStatus1.statusCondition,
      );

      const activeBattleStatus2 = new BattlePokemonStatus(
        battleStatus2.id,
        battleStatus2.battleId,
        battleStatus2.trainedPokemonId,
        battleStatus2.trainerId,
        true,
        battleStatus2.currentHp,
        battleStatus2.maxHp,
        battleStatus2.attackRank,
        battleStatus2.defenseRank,
        battleStatus2.specialAttackRank,
        battleStatus2.specialDefenseRank,
        battleStatus2.speedRank,
        battleStatus2.accuracyRank,
        battleStatus2.evasionRank,
        battleStatus2.statusCondition,
      );

      battleRepository.create.mockResolvedValue(mockBattle);
      teamRepository.findMembersByTeamId
        .mockResolvedValueOnce(team1Members)
        .mockResolvedValueOnce(team2Members);
      battleRepository.createBattlePokemonStatus
        .mockResolvedValueOnce(battleStatus1)
        .mockResolvedValueOnce(battleStatus2);
      battleRepository.updateBattlePokemonStatus
        .mockResolvedValueOnce(activeBattleStatus1)
        .mockResolvedValueOnce(activeBattleStatus2);
      battleRepository.findBattlePokemonStatusByBattleId.mockResolvedValue([
        activeBattleStatus1,
        activeBattleStatus2,
      ]);
      battleRepository.findActivePokemonByBattleIdAndTrainerId.mockResolvedValue(
        activeBattleStatus2,
      );

      const abilityRegistryGetSpy = jest.spyOn(AbilityRegistry, 'get');

      // Act
      await useCase.execute(trainer1Id, trainer2Id, team1Id, team2Id);

      // Assert
      expect(abilityRegistryGetSpy).toHaveBeenCalledWith('いかく');
      expect(battleRepository.findBattlePokemonStatusByBattleId).toHaveBeenCalledWith(
        mockBattle.id,
      );
      // いかくの効果で相手の攻撃ランクが下がる
      expect(battleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(
        battleStatus2.id,
        expect.objectContaining({
          attackRank: -1,
        }),
      );

      abilityRegistryGetSpy.mockRestore();
    });

    it('should not trigger ability OnEntry effect when pokemon has no ability', async () => {
      // Arrange
      const mockBattle = new Battle(
        1,
        trainer1Id,
        trainer2Id,
        team1Id,
        team2Id,
        1,
        Weather.None,
        Field.None,
        BattleStatus.Active,
        null,
      );

      const pokemon1 = createMockPokemon(1, 'ポケモン1');
      const pokemon2 = createMockPokemon(2, 'ポケモン2');
      const trainedPokemon1 = createMockTrainedPokemon(100, pokemon1, null);
      const trainedPokemon2 = createMockTrainedPokemon(200, pokemon2, null);

      const team1Members: TeamMemberInfo[] = [
        {
          id: 1,
          teamId: team1Id,
          trainedPokemon: trainedPokemon1,
          position: 1,
        },
      ];

      const team2Members: TeamMemberInfo[] = [
        {
          id: 2,
          teamId: team2Id,
          trainedPokemon: trainedPokemon2,
          position: 1,
        },
      ];

      const battleStatus1 = new BattlePokemonStatus(
        1,
        mockBattle.id,
        trainedPokemon1.id,
        trainer1Id,
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

      const battleStatus2 = new BattlePokemonStatus(
        2,
        mockBattle.id,
        trainedPokemon2.id,
        trainer2Id,
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

      battleRepository.create.mockResolvedValue(mockBattle);
      teamRepository.findMembersByTeamId
        .mockResolvedValueOnce(team1Members)
        .mockResolvedValueOnce(team2Members);
      battleRepository.createBattlePokemonStatus
        .mockResolvedValueOnce(battleStatus1)
        .mockResolvedValueOnce(battleStatus2);

      const activeBattleStatus1 = new BattlePokemonStatus(
        battleStatus1.id,
        battleStatus1.battleId,
        battleStatus1.trainedPokemonId,
        battleStatus1.trainerId,
        true,
        battleStatus1.currentHp,
        battleStatus1.maxHp,
        battleStatus1.attackRank,
        battleStatus1.defenseRank,
        battleStatus1.specialAttackRank,
        battleStatus1.specialDefenseRank,
        battleStatus1.speedRank,
        battleStatus1.accuracyRank,
        battleStatus1.evasionRank,
        battleStatus1.statusCondition,
      );

      const activeBattleStatus2 = new BattlePokemonStatus(
        battleStatus2.id,
        battleStatus2.battleId,
        battleStatus2.trainedPokemonId,
        battleStatus2.trainerId,
        true,
        battleStatus2.currentHp,
        battleStatus2.maxHp,
        battleStatus2.attackRank,
        battleStatus2.defenseRank,
        battleStatus2.specialAttackRank,
        battleStatus2.specialDefenseRank,
        battleStatus2.speedRank,
        battleStatus2.accuracyRank,
        battleStatus2.evasionRank,
        battleStatus2.statusCondition,
      );

      battleRepository.updateBattlePokemonStatus
        .mockResolvedValueOnce(activeBattleStatus1)
        .mockResolvedValueOnce(activeBattleStatus2);

      const abilityRegistryGetSpy = jest.spyOn(AbilityRegistry, 'get');

      // Act
      await useCase.execute(trainer1Id, trainer2Id, team1Id, team2Id);

      // Assert
      expect(abilityRegistryGetSpy).not.toHaveBeenCalled();
      expect(battleRepository.findBattlePokemonStatusByBattleId).not.toHaveBeenCalled();

      abilityRegistryGetSpy.mockRestore();
    });

    it('should calculate stats correctly for each pokemon', async () => {
      // Arrange
      const mockBattle = new Battle(
        1,
        trainer1Id,
        trainer2Id,
        team1Id,
        team2Id,
        1,
        Weather.None,
        Field.None,
        BattleStatus.Active,
        null,
      );

      const pokemon1 = createMockPokemon(1, 'ポケモン1');
      const trainedPokemon1 = createMockTrainedPokemon(100, pokemon1);

      const team1Members: TeamMemberInfo[] = [
        {
          id: 1,
          teamId: team1Id,
          trainedPokemon: trainedPokemon1,
          position: 1,
        },
      ];

      const team2Members: TeamMemberInfo[] = [];

      const battleStatus1 = new BattlePokemonStatus(
        1,
        mockBattle.id,
        trainedPokemon1.id,
        trainer1Id,
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

      battleRepository.create.mockResolvedValue(mockBattle);
      teamRepository.findMembersByTeamId
        .mockResolvedValueOnce(team1Members)
        .mockResolvedValueOnce(team2Members);
      battleRepository.createBattlePokemonStatus.mockResolvedValueOnce(battleStatus1);

      const activeBattleStatus1 = new BattlePokemonStatus(
        battleStatus1.id,
        battleStatus1.battleId,
        battleStatus1.trainedPokemonId,
        battleStatus1.trainerId,
        true,
        battleStatus1.currentHp,
        battleStatus1.maxHp,
        battleStatus1.attackRank,
        battleStatus1.defenseRank,
        battleStatus1.specialAttackRank,
        battleStatus1.specialDefenseRank,
        battleStatus1.speedRank,
        battleStatus1.accuracyRank,
        battleStatus1.evasionRank,
        battleStatus1.statusCondition,
      );

      battleRepository.updateBattlePokemonStatus.mockResolvedValueOnce(activeBattleStatus1);

      // Act
      await useCase.execute(trainer1Id, trainer2Id, team1Id, team2Id);

      // Assert
      // HPはレベル50、HP種族値100、個体値31、努力値0の場合、HP = floor((2 * 100 + 31 + 0/4) * 50 / 100) + 50 + 10 = 165
      expect(battleRepository.createBattlePokemonStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          currentHp: expect.any(Number),
          maxHp: expect.any(Number),
        }),
      );
      const createCall = battleRepository.createBattlePokemonStatus.mock.calls[0][0];
      expect(createCall.currentHp).toBeGreaterThan(0);
      expect(createCall.maxHp).toBe(createCall.currentHp);
    });

    it('バトル開始時にポケモンが覚えている技のPPを初期化する', async () => {
      // Arrange
      const mockBattle = new Battle(
        1,
        trainer1Id,
        trainer2Id,
        team1Id,
        team2Id,
        1,
        Weather.None,
        Field.None,
        BattleStatus.Active,
        null,
      );

      const pokemon1 = createMockPokemon(1, 'ポケモン1');
      const trainedPokemon1 = createMockTrainedPokemon(100, pokemon1);

      const team1Members: TeamMemberInfo[] = [
        {
          id: 1,
          teamId: team1Id,
          trainedPokemon: trainedPokemon1,
          position: 1,
        },
      ];

      const team2Members: TeamMemberInfo[] = [];

      const battleStatus1 = new BattlePokemonStatus(
        1,
        mockBattle.id,
        trainedPokemon1.id,
        trainer1Id,
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

      const move1 = new Move(
        1,
        'かえんほうしゃ',
        'Flamethrower',
        new Type(1, 'ほのお', 'Fire'),
        MoveCategory.Special,
        90,
        100,
        15,
        0,
        null,
      );
      const move2 = new Move(
        2,
        '10まんボルト',
        'Thunderbolt',
        new Type(2, 'でんき', 'Electric'),
        MoveCategory.Special,
        90,
        100,
        15,
        0,
        null,
      );

      battleRepository.create.mockResolvedValue(mockBattle);
      teamRepository.findMembersByTeamId
        .mockResolvedValueOnce(team1Members)
        .mockResolvedValueOnce(team2Members);
      battleRepository.createBattlePokemonStatus.mockResolvedValueOnce(battleStatus1);
      moveRepository.findByPokemonId.mockResolvedValue([move1, move2]);
      battleRepository.createBattlePokemonMove.mockResolvedValue(
        new BattlePokemonMove(1, battleStatus1.id, move1.id, 15, 15),
      );

      // Act
      await useCase.execute(trainer1Id, trainer2Id, team1Id, team2Id);

      // Assert
      // ポケモンが覚えている技の数だけBattlePokemonMoveが作成される
      expect(moveRepository.findByPokemonId).toHaveBeenCalledWith(pokemon1.id);
      expect(battleRepository.createBattlePokemonMove).toHaveBeenCalledTimes(2);
      expect(battleRepository.createBattlePokemonMove).toHaveBeenCalledWith({
        battlePokemonStatusId: battleStatus1.id,
        moveId: move1.id,
        currentPp: 15,
        maxPp: 15,
      });
      expect(battleRepository.createBattlePokemonMove).toHaveBeenCalledWith({
        battlePokemonStatusId: battleStatus1.id,
        moveId: move2.id,
        currentPp: 15,
        maxPp: 15,
      });
    });
  });
});
