import { Test, TestingModule } from '@nestjs/testing';
import { ExecuteTurnUseCase, ExecuteTurnParams } from './execute-turn.use-case';
import {
  IBattleRepository,
  BATTLE_REPOSITORY_TOKEN,
} from '../../domain/battle.repository.interface';
import {
  ITrainedPokemonRepository,
  TRAINED_POKEMON_REPOSITORY_TOKEN,
} from '@/modules/trainer/domain/trainer.repository.interface';
import {
  IMoveRepository,
  ITypeEffectivenessRepository,
  MOVE_REPOSITORY_TOKEN,
  TYPE_EFFECTIVENESS_REPOSITORY_TOKEN,
} from '@/modules/pokemon/domain/pokemon.repository.interface';
import { Battle, BattleStatus, Weather, Field } from '../../domain/entities/battle.entity';
import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import { BattlePokemonMove } from '../../domain/entities/battle-pokemon-move.entity';
import { StatusCondition } from '../../domain/entities/status-condition.enum';
import { Move, MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { Type } from '@/modules/pokemon/domain/entities/type.entity';
import { TrainedPokemon, Gender } from '@/modules/trainer/domain/entities/trained-pokemon.entity';
import { Pokemon } from '@/modules/pokemon/domain/entities/pokemon.entity';
import { Ability } from '@/modules/pokemon/domain/entities/ability.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { Nature } from '../../domain/logic/stat-calculator';

describe('ExecuteTurnUseCase', () => {
  let useCase: ExecuteTurnUseCase;
  let battleRepository: jest.Mocked<IBattleRepository>;
  let trainedPokemonRepository: jest.Mocked<ITrainedPokemonRepository>;
  let moveRepository: jest.Mocked<IMoveRepository>;
  let typeEffectivenessRepository: jest.Mocked<ITypeEffectivenessRepository>;

  const trainer1Id = 1;
  const trainer2Id = 2;
  const battleId = 100;

  beforeEach(async () => {
    const mockBattleRepository: jest.Mocked<IBattleRepository> = {
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findBattlePokemonStatusByBattleId: jest.fn(),
      createBattlePokemonStatus: jest.fn(),
      updateBattlePokemonStatus: jest.fn(),
      findActivePokemonByBattleIdAndTrainerId: jest.fn(),
      findBattlePokemonMovesByBattlePokemonStatusId: jest.fn(),
      createBattlePokemonMove: jest.fn(),
      updateBattlePokemonMove: jest.fn(),
      findBattlePokemonMoveById: jest.fn(),
    };

    const mockTrainedPokemonRepository: jest.Mocked<ITrainedPokemonRepository> = {
      findById: jest.fn(),
      findByTrainerId: jest.fn(),
    };

    const mockMoveRepository: jest.Mocked<IMoveRepository> = {
      findById: jest.fn(),
      findByPokemonId: jest.fn(),
    };

    const mockTypeEffectivenessRepository: jest.Mocked<ITypeEffectivenessRepository> = {
      getTypeEffectivenessMap: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExecuteTurnUseCase,
        {
          provide: BATTLE_REPOSITORY_TOKEN,
          useValue: mockBattleRepository,
        },
        {
          provide: TRAINED_POKEMON_REPOSITORY_TOKEN,
          useValue: mockTrainedPokemonRepository,
        },
        {
          provide: MOVE_REPOSITORY_TOKEN,
          useValue: mockMoveRepository,
        },
        {
          provide: TYPE_EFFECTIVENESS_REPOSITORY_TOKEN,
          useValue: mockTypeEffectivenessRepository,
        },
      ],
    }).compile();

    useCase = module.get<ExecuteTurnUseCase>(ExecuteTurnUseCase);
    battleRepository = module.get(BATTLE_REPOSITORY_TOKEN);
    trainedPokemonRepository = module.get(TRAINED_POKEMON_REPOSITORY_TOKEN);
    moveRepository = module.get(MOVE_REPOSITORY_TOKEN);
    typeEffectivenessRepository = module.get(TYPE_EFFECTIVENESS_REPOSITORY_TOKEN);

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
    const createMockBattle = (): Battle => {
      return new Battle(
        battleId,
        trainer1Id,
        trainer2Id,
        10,
        20,
        1,
        Weather.None,
        Field.None,
        BattleStatus.Active,
        null,
      );
    };

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

    const createMockBattlePokemonStatus = (
      id: number,
      trainedPokemonId: number,
      trainerId: number,
      currentHp: number = 100,
      maxHp: number = 100,
    ): BattlePokemonStatus => {
      return new BattlePokemonStatus(
        id,
        battleId,
        trainedPokemonId,
        trainerId,
        true,
        currentHp,
        maxHp,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        null,
      );
    };

    it('should throw error when battle not found', async () => {
      // Arrange
      const params: ExecuteTurnParams = {
        battleId,
        trainer1Action: { trainerId: trainer1Id, moveId: 1 },
        trainer2Action: { trainerId: trainer2Id, moveId: 2 },
      };

      battleRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(params)).rejects.toThrow('Battle not found');
    });

    it('should throw error when battle is not active', async () => {
      // Arrange
      const params: ExecuteTurnParams = {
        battleId,
        trainer1Action: { trainerId: trainer1Id, moveId: 1 },
        trainer2Action: { trainerId: trainer2Id, moveId: 2 },
      };

      const battle = createMockBattle();
      const inactiveBattle = new Battle(
        battle.id,
        battle.trainer1Id,
        battle.trainer2Id,
        battle.team1Id,
        battle.team2Id,
        battle.turn,
        battle.weather,
        battle.field,
        BattleStatus.Completed,
        battle.winnerTrainerId,
      );

      battleRepository.findById.mockResolvedValue(inactiveBattle);

      // Act & Assert
      await expect(useCase.execute(params)).rejects.toThrow('Battle is not active');
    });

    it('should execute move and deal damage', async () => {
      // Arrange
      const battle = createMockBattle();
      const pokemon1 = createMockPokemon(1, 'ポケモン1');
      const pokemon2 = createMockPokemon(2, 'ポケモン2');
      const trainedPokemon1 = createMockTrainedPokemon(100, pokemon1);
      const trainedPokemon2 = createMockTrainedPokemon(200, pokemon2);

      const attackerStatus = createMockBattlePokemonStatus(1, 100, trainer1Id, 100, 100);
      const defenderStatus = createMockBattlePokemonStatus(2, 200, trainer2Id, 100, 100);

      const move = new Move(
        1,
        'たいあたり',
        'Tackle',
        new Type(1, 'ノーマル', 'Normal'),
        MoveCategory.Physical,
        40,
        100,
        35,
        0,
        null,
      );

      const battlePokemonMove = new BattlePokemonMove(1, attackerStatus.id, move.id, 35, 35);

      const typeEffectivenessMap = new Map<string, number>();
      typeEffectivenessMap.set('1-1', 1.0); // Normal-Normal (攻撃側タイプ-防御側タイプ)
      // 防御側のタイプに対する相性も必要
      typeEffectivenessMap.set('1-', 1.0); // Normal-なし

      battleRepository.findById.mockResolvedValue(battle);
      battleRepository.findActivePokemonByBattleIdAndTrainerId
        .mockResolvedValueOnce(attackerStatus)
        .mockResolvedValueOnce(defenderStatus);
      battleRepository.findBattlePokemonMovesByBattlePokemonStatusId
        .mockResolvedValueOnce([battlePokemonMove]) // PPチェック用（trainer1）
        .mockResolvedValueOnce([battlePokemonMove]) // PPチェック用（trainer2）
        .mockResolvedValueOnce([battlePokemonMove]) // PPチェック用（trainer1、2回目の行動）
        .mockResolvedValueOnce([battlePokemonMove]); // PPチェック用（trainer2、2回目の行動）
      // determineActionOrderで両方の技を取得
      moveRepository.findById
        .mockResolvedValueOnce(move) // trainer1の技（determineActionOrder）
        .mockResolvedValueOnce(move) // trainer2の技（determineActionOrder）
        .mockResolvedValueOnce(move) // trainer1の技（executeMove）
        .mockResolvedValueOnce(move); // trainer2の技（executeMove - 2回目の行動）
      // determineActionOrderで優先度補正のためにTrainedPokemonを取得
      // getEffectiveSpeedで速度計算のためにTrainedPokemonを取得
      // executeMoveで命中率判定の前にTrainedPokemonを取得するため、呼び出し回数が増える
      trainedPokemonRepository.findById
        .mockResolvedValueOnce(trainedPokemon1) // determineActionOrderでtrainer1取得（優先度補正のため）
        .mockResolvedValueOnce(trainedPokemon2) // determineActionOrderでtrainer2取得（優先度補正のため）
        .mockResolvedValueOnce(trainedPokemon1) // getEffectiveSpeedでtrainer1取得（速度計算のため）
        .mockResolvedValueOnce(trainedPokemon2) // getEffectiveSpeedでtrainer2取得（速度計算のため）
        .mockResolvedValueOnce(trainedPokemon1) // executeMoveでattacker取得（命中率判定のため）
        .mockResolvedValueOnce(trainedPokemon2) // executeMoveでdefender取得（命中率判定のため）
        .mockResolvedValueOnce(trainedPokemon1) // executeMoveでattacker取得（2回目の行動、命中率判定のため）
        .mockResolvedValueOnce(trainedPokemon2); // executeMoveでdefender取得（2回目の行動、命中率判定のため）
      typeEffectivenessRepository.getTypeEffectivenessMap.mockResolvedValue(typeEffectivenessMap);
      battleRepository.findBattlePokemonStatusByBattleId.mockResolvedValue([
        attackerStatus,
        defenderStatus,
      ]);
      battleRepository.findBattlePokemonMoveById
        .mockResolvedValueOnce(battlePokemonMove) // consumePp用（trainer1）
        .mockResolvedValueOnce(battlePokemonMove) // consumePp用（trainer2）
        .mockResolvedValueOnce(battlePokemonMove) // consumePp用（trainer1、2回目の行動）
        .mockResolvedValueOnce(battlePokemonMove); // consumePp用（trainer2、2回目の行動）
      battleRepository.updateBattlePokemonMove.mockResolvedValue(
        new BattlePokemonMove(1, attackerStatus.id, move.id, 34, 35),
      );

      const updatedDefenderStatus = new BattlePokemonStatus(
        defenderStatus.id,
        defenderStatus.battleId,
        defenderStatus.trainedPokemonId,
        defenderStatus.trainerId,
        defenderStatus.isActive,
        60, // ダメージを受けた後のHP
        defenderStatus.maxHp,
        defenderStatus.attackRank,
        defenderStatus.defenseRank,
        defenderStatus.specialAttackRank,
        defenderStatus.specialDefenseRank,
        defenderStatus.speedRank,
        defenderStatus.accuracyRank,
        defenderStatus.evasionRank,
        defenderStatus.statusCondition,
      );

      battleRepository.updateBattlePokemonStatus.mockResolvedValue(updatedDefenderStatus);
      battleRepository.findBattlePokemonStatusByBattleId.mockResolvedValue([
        attackerStatus,
        defenderStatus,
      ]);
      battleRepository.update.mockResolvedValue({
        ...battle,
        turn: battle.turn + 1,
      });

      const params: ExecuteTurnParams = {
        battleId,
        trainer1Action: { trainerId: trainer1Id, moveId: 1 },
        trainer2Action: { trainerId: trainer2Id, moveId: 1 },
      };

      // Act
      const result = await useCase.execute(params);

      // Assert
      expect(result.battle.turn).toBe(2);
      expect(result.actions.length).toBeGreaterThan(0);
      expect(battleRepository.updateBattlePokemonStatus).toHaveBeenCalled();
    });

    it('should execute switch pokemon', async () => {
      // Arrange
      const battle = createMockBattle();
      const pokemon1 = createMockPokemon(1, 'ポケモン1');
      const pokemon2 = createMockPokemon(2, 'ポケモン2');
      const trainedPokemon1 = createMockTrainedPokemon(100, pokemon1);
      const trainedPokemon2 = createMockTrainedPokemon(200, pokemon2);

      const currentActiveStatus = createMockBattlePokemonStatus(1, 100, trainer1Id, 100, 100);
      const switchTargetStatus = createMockBattlePokemonStatus(2, 200, trainer1Id, 100, 100);

      const trainer2ActiveStatus = createMockBattlePokemonStatus(3, 300, trainer2Id, 100, 100);
      const pokemon3 = createMockPokemon(3, 'ポケモン3');
      const trainedPokemon3 = createMockTrainedPokemon(300, pokemon3);
      const move = new Move(
        1,
        'たいあたり',
        'Tackle',
        new Type(1, 'ノーマル', 'Normal'),
        MoveCategory.Physical,
        40,
        100,
        35,
        0,
        null,
      );

      const battlePokemonMove = new BattlePokemonMove(1, trainer2ActiveStatus.id, move.id, 35, 35);

      battleRepository.findById.mockResolvedValue(battle);
      battleRepository.findActivePokemonByBattleIdAndTrainerId
        .mockResolvedValueOnce(currentActiveStatus)
        .mockResolvedValueOnce(trainer2ActiveStatus);
      battleRepository.findBattlePokemonMovesByBattlePokemonStatusId.mockResolvedValueOnce([
        battlePokemonMove,
      ]); // PPチェック用（trainer2）
      battleRepository.findBattlePokemonStatusByBattleId.mockResolvedValue([
        currentActiveStatus,
        switchTargetStatus,
        trainer2ActiveStatus,
      ]);
      // trainer2が技を使用する場合のモック
      moveRepository.findById.mockResolvedValue(move);
      // getEffectiveSpeedで使用
      // executeMoveで命中率判定のためにTrainedPokemonを取得
      trainedPokemonRepository.findById
        .mockResolvedValueOnce(trainedPokemon1) // trainer1の速度計算
        .mockResolvedValueOnce(trainedPokemon3) // trainer2の速度計算
        .mockResolvedValueOnce(trainedPokemon3) // executeMoveでtrainer2取得（attacker）
        .mockResolvedValueOnce(trainedPokemon1); // executeMoveでtrainer1取得（defender）
      const typeEffectivenessMap = new Map<string, number>();
      typeEffectivenessMap.set('1-1', 1.0);
      typeEffectivenessMap.set('1-', 1.0);
      typeEffectivenessRepository.getTypeEffectivenessMap.mockResolvedValue(typeEffectivenessMap);
      const inactiveStatus = new BattlePokemonStatus(
        currentActiveStatus.id,
        currentActiveStatus.battleId,
        currentActiveStatus.trainedPokemonId,
        currentActiveStatus.trainerId,
        false,
        currentActiveStatus.currentHp,
        currentActiveStatus.maxHp,
        currentActiveStatus.attackRank,
        currentActiveStatus.defenseRank,
        currentActiveStatus.specialAttackRank,
        currentActiveStatus.specialDefenseRank,
        currentActiveStatus.speedRank,
        currentActiveStatus.accuracyRank,
        currentActiveStatus.evasionRank,
        currentActiveStatus.statusCondition,
      );

      const activeSwitchStatus = new BattlePokemonStatus(
        switchTargetStatus.id,
        switchTargetStatus.battleId,
        switchTargetStatus.trainedPokemonId,
        switchTargetStatus.trainerId,
        true,
        switchTargetStatus.currentHp,
        switchTargetStatus.maxHp,
        switchTargetStatus.attackRank,
        switchTargetStatus.defenseRank,
        switchTargetStatus.specialAttackRank,
        switchTargetStatus.specialDefenseRank,
        switchTargetStatus.speedRank,
        switchTargetStatus.accuracyRank,
        switchTargetStatus.evasionRank,
        switchTargetStatus.statusCondition,
      );

      battleRepository.updateBattlePokemonStatus
        .mockResolvedValueOnce(inactiveStatus)
        .mockResolvedValueOnce(activeSwitchStatus);
      battleRepository.findBattlePokemonMoveById.mockResolvedValue(battlePokemonMove);
      battleRepository.updateBattlePokemonMove.mockResolvedValue(
        new BattlePokemonMove(1, trainer2ActiveStatus.id, move.id, 34, 35),
      );
      battleRepository.update.mockResolvedValue({
        ...battle,
        turn: battle.turn + 1,
      });

      const params: ExecuteTurnParams = {
        battleId,
        trainer1Action: { trainerId: trainer1Id, switchPokemonId: 200 },
        trainer2Action: { trainerId: trainer2Id, moveId: 1 },
      };

      // Act
      const result = await useCase.execute(params);

      // Assert
      expect(result.battle.turn).toBe(2);
      expect(result.actions.some(a => a.action === 'switch')).toBe(true);
      // 交代処理が実行されたことを確認
      expect(battleRepository.updateBattlePokemonStatus).toHaveBeenCalled();
    });

    it.skip('should determine winner when defender faints', async () => {
      // Arrange
      const battle = createMockBattle();
      const pokemon1 = createMockPokemon(1, 'ポケモン1');
      const pokemon2 = createMockPokemon(2, 'ポケモン2');
      const trainedPokemon1 = createMockTrainedPokemon(100, pokemon1);
      const trainedPokemon2 = createMockTrainedPokemon(200, pokemon2);

      const attackerStatus = createMockBattlePokemonStatus(1, 100, trainer1Id, 100, 100);
      const defenderStatus = createMockBattlePokemonStatus(2, 200, trainer2Id, 10, 100); // HPが低い

      const move = new Move(
        1,
        'たいあたり',
        'Tackle',
        new Type(1, 'ノーマル', 'Normal'),
        MoveCategory.Physical,
        40,
        100,
        35,
        0,
        null,
      );

      const typeEffectivenessMap = new Map<string, number>();
      typeEffectivenessMap.set('1-1', 1.0); // Normal-Normal
      typeEffectivenessMap.set('1-', 1.0); // Normal-なし

      // execute開始時にバトルを取得（アクティブ状態）
      battleRepository.findById
        .mockResolvedValueOnce(battle) // execute開始時
        .mockResolvedValueOnce(battle); // checkWinner内で呼ばれる

      battleRepository.findActivePokemonByBattleIdAndTrainerId
        .mockResolvedValueOnce(attackerStatus)
        .mockResolvedValueOnce(defenderStatus);
      moveRepository.findById.mockResolvedValue(move);
      trainedPokemonRepository.findById
        .mockResolvedValueOnce(trainedPokemon1)
        .mockResolvedValueOnce(trainedPokemon2);
      typeEffectivenessRepository.getTypeEffectivenessMap.mockResolvedValue(typeEffectivenessMap);

      const faintedDefenderStatus = new BattlePokemonStatus(
        defenderStatus.id,
        defenderStatus.battleId,
        defenderStatus.trainedPokemonId,
        defenderStatus.trainerId,
        defenderStatus.isActive,
        0, // 倒れた
        defenderStatus.maxHp,
        defenderStatus.attackRank,
        defenderStatus.defenseRank,
        defenderStatus.specialAttackRank,
        defenderStatus.specialDefenseRank,
        defenderStatus.speedRank,
        defenderStatus.accuracyRank,
        defenderStatus.evasionRank,
        defenderStatus.statusCondition,
      );

      // determineActionOrderで使用（trainer2は行動しないため、trainer1の技のみ）
      moveRepository.findById.mockResolvedValueOnce(move); // executeMoveで使用
      trainedPokemonRepository.findById
        .mockResolvedValueOnce(trainedPokemon1) // executeMoveでattacker取得
        .mockResolvedValueOnce(trainedPokemon2); // executeMoveでdefender取得

      battleRepository.updateBattlePokemonStatus.mockResolvedValue(faintedDefenderStatus);
      // determineActionOrderで使用
      battleRepository.findBattlePokemonStatusByBattleId.mockResolvedValueOnce([
        attackerStatus,
        defenderStatus,
      ]);
      // executeMove後の状態（processTurnEndAbilitiesで使用）
      battleRepository.findBattlePokemonStatusByBattleId.mockResolvedValueOnce([
        attackerStatus,
        faintedDefenderStatus,
      ]);
      // checkWinnerで使用（トレーナー2の他のポケモンがいない場合）
      // トレーナー2のポケモン一覧（すべて倒れている）
      battleRepository.findBattlePokemonStatusByBattleId.mockResolvedValueOnce([
        faintedDefenderStatus,
      ]);
      // checkWinnerでトレーナー2のアクティブポケモンを取得（倒れている）
      battleRepository.findActivePokemonByBattleIdAndTrainerId
        .mockResolvedValueOnce(attackerStatus) // 最初の取得（execute開始時）
        .mockResolvedValueOnce(defenderStatus) // 最初の取得（execute開始時）
        .mockResolvedValueOnce(attackerStatus) // checkWinnerでトレーナー1のアクティブポケモン取得
        .mockResolvedValueOnce(faintedDefenderStatus); // checkWinnerでトレーナー2のアクティブポケモン取得（倒れている）

      const completedBattle = new Battle(
        battle.id,
        battle.trainer1Id,
        battle.trainer2Id,
        battle.team1Id,
        battle.team2Id,
        battle.turn,
        battle.weather,
        battle.field,
        BattleStatus.Completed,
        trainer1Id,
      );

      // execute開始時にバトルを取得（アクティブ状態）
      battleRepository.findById
        .mockResolvedValueOnce(battle) // execute開始時
        .mockResolvedValueOnce(battle); // checkWinner内で呼ばれる

      battleRepository.update.mockResolvedValueOnce(completedBattle);
      // executeの最後で更新されたバトルを取得
      battleRepository.findById.mockResolvedValueOnce(completedBattle);

      // trainer2は行動しない（既に倒れている想定）
      const params: ExecuteTurnParams = {
        battleId,
        trainer1Action: { trainerId: trainer1Id, moveId: 1 },
        trainer2Action: { trainerId: trainer2Id }, // 行動なし
      };

      // Act
      const result = await useCase.execute(params);

      // Assert
      expect(result.winnerTrainerId).toBe(trainer1Id);
      expect(result.battle.status).toBe(BattleStatus.Completed);
    });

    it('should handle status move correctly', async () => {
      // Arrange
      const battle = createMockBattle();
      const pokemon1 = createMockPokemon(1, 'ポケモン1');
      const pokemon2 = createMockPokemon(2, 'ポケモン2');
      const trainedPokemon1 = createMockTrainedPokemon(100, pokemon1);
      const trainedPokemon2 = createMockTrainedPokemon(200, pokemon2);

      const attackerStatus = createMockBattlePokemonStatus(1, 100, trainer1Id, 100, 100);
      const defenderStatus = createMockBattlePokemonStatus(2, 200, trainer2Id, 100, 100);

      const statusMove = new Move(
        1,
        'なきごえ',
        'Growl',
        new Type(1, 'ノーマル', 'Normal'),
        MoveCategory.Status,
        null,
        100,
        40,
        0,
        null,
      );

      const battlePokemonMove = new BattlePokemonMove(1, attackerStatus.id, statusMove.id, 40, 40);

      battleRepository.findById.mockResolvedValue(battle);
      battleRepository.findActivePokemonByBattleIdAndTrainerId
        .mockResolvedValueOnce(attackerStatus)
        .mockResolvedValueOnce(defenderStatus);
      battleRepository.findBattlePokemonMovesByBattlePokemonStatusId
        .mockResolvedValueOnce([battlePokemonMove]) // PPチェック用（trainer1）
        .mockResolvedValueOnce([battlePokemonMove]) // PPチェック用（trainer2）
        .mockResolvedValueOnce([battlePokemonMove]) // PPチェック用（trainer1、2回目の行動）
        .mockResolvedValueOnce([battlePokemonMove]); // PPチェック用（trainer2、2回目の行動）
      // determineActionOrderで両方の技を取得
      moveRepository.findById
        .mockResolvedValueOnce(statusMove) // trainer1の技（determineActionOrder）
        .mockResolvedValueOnce(statusMove) // trainer2の技（determineActionOrder）
        .mockResolvedValueOnce(statusMove) // trainer1の技（executeMove）
        .mockResolvedValueOnce(statusMove); // trainer2の技（executeMove - 2回目の行動）
      // determineActionOrderで優先度補正のためにTrainedPokemonを取得
      // getEffectiveSpeedで速度計算のためにTrainedPokemonを取得
      // executeMoveで命中率判定の前にTrainedPokemonを取得するため、呼び出し回数が増える
      // 変化技の場合は命中率判定がスキップされるが、TrainedPokemonの取得は行われる
      trainedPokemonRepository.findById
        .mockResolvedValueOnce(trainedPokemon1) // determineActionOrderでtrainer1取得（優先度補正のため）
        .mockResolvedValueOnce(trainedPokemon2) // determineActionOrderでtrainer2取得（優先度補正のため）
        .mockResolvedValueOnce(trainedPokemon1) // getEffectiveSpeedでtrainer1取得（速度計算のため）
        .mockResolvedValueOnce(trainedPokemon2) // getEffectiveSpeedでtrainer2取得（速度計算のため）
        .mockResolvedValueOnce(trainedPokemon1) // executeMoveでattacker取得（命中率判定のため、変化技の場合はスキップされるが取得は行われる）
        .mockResolvedValueOnce(trainedPokemon2) // executeMoveでdefender取得（命中率判定のため、変化技の場合はスキップされるが取得は行われる）
        .mockResolvedValueOnce(trainedPokemon1) // executeMoveでattacker取得（2回目の行動、命中率判定のため）
        .mockResolvedValueOnce(trainedPokemon2); // executeMoveでdefender取得（2回目の行動、命中率判定のため）
      battleRepository.findBattlePokemonStatusByBattleId.mockResolvedValue([
        attackerStatus,
        defenderStatus,
      ]);
      battleRepository.findBattlePokemonMoveById
        .mockResolvedValueOnce(battlePokemonMove) // consumePp用（trainer1）
        .mockResolvedValueOnce(battlePokemonMove) // consumePp用（trainer2）
        .mockResolvedValueOnce(battlePokemonMove) // consumePp用（trainer1、2回目の行動）
        .mockResolvedValueOnce(battlePokemonMove); // consumePp用（trainer2、2回目の行動）
      battleRepository.updateBattlePokemonMove.mockResolvedValue(
        new BattlePokemonMove(1, attackerStatus.id, statusMove.id, 39, 40),
      );
      battleRepository.update.mockResolvedValue({
        ...battle,
        turn: battle.turn + 1,
      });

      const params: ExecuteTurnParams = {
        battleId,
        trainer1Action: { trainerId: trainer1Id, moveId: 1 },
        trainer2Action: { trainerId: trainer2Id, moveId: 1 },
      };

      // Act
      const result = await useCase.execute(params);

      // Assert
      expect(result.battle.turn).toBe(2);
      expect(result.actions.some(a => a.result.includes('Status move'))).toBe(true);
      // 変化技はダメージを与えない
      expect(battleRepository.updateBattlePokemonStatus).not.toHaveBeenCalledWith(
        defenderStatus.id,
        expect.objectContaining({ currentHp: expect.any(Number) }),
      );
    });
  });

  describe('PP管理', () => {
    it('PPが0の場合は技を使用できない', async () => {
      // Arrange
      const battle = new Battle(
        battleId,
        trainer1Id,
        trainer2Id,
        1,
        2,
        1,
        Weather.None,
        Field.None,
        BattleStatus.Active,
        null,
      );

      const attackerStatus = new BattlePokemonStatus(
        1,
        battleId,
        101,
        trainer1Id,
        true,
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

      const defenderStatus = new BattlePokemonStatus(
        2,
        battleId,
        102,
        trainer2Id,
        true,
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

      const move = new Move(
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

      // PPが0のBattlePokemonMove
      const battlePokemonMove = new BattlePokemonMove(1, attackerStatus.id, move.id, 0, 15);

      const trainedPokemon1 = new TrainedPokemon(
        101,
        trainer1Id,
        new Pokemon(
          1,
          1,
          'ポケモン1',
          'Pokemon1',
          new Type(1, 'ノーマル', 'Normal'),
          null,
          100,
          50,
          50,
          50,
          50,
          50,
        ),
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

      const trainedPokemon2 = new TrainedPokemon(
        102,
        trainer2Id,
        new Pokemon(
          2,
          2,
          'ポケモン2',
          'Pokemon2',
          new Type(1, 'ノーマル', 'Normal'),
          null,
          100,
          50,
          50,
          50,
          50,
          50,
        ),
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

      battleRepository.findById.mockResolvedValue(battle);
      battleRepository.findActivePokemonByBattleIdAndTrainerId
        .mockResolvedValueOnce(attackerStatus)
        .mockResolvedValueOnce(defenderStatus);
      // determineActionOrderで技の優先度を取得するため
      moveRepository.findById
        .mockResolvedValueOnce(move) // determineActionOrder用（trainer1）
        .mockResolvedValueOnce(move); // determineActionOrder用（trainer2）
      // determineActionOrderで特性による優先度補正のためにTrainedPokemonを取得
      // getEffectiveSpeedで速度計算のためにTrainedPokemonを取得
      trainedPokemonRepository.findById
        .mockResolvedValueOnce(trainedPokemon1) // determineActionOrder用（trainer1、優先度補正）
        .mockResolvedValueOnce(trainedPokemon2) // determineActionOrder用（trainer2、優先度補正）
        .mockResolvedValueOnce(trainedPokemon1) // getEffectiveSpeed用（trainer1）
        .mockResolvedValueOnce(trainedPokemon2); // getEffectiveSpeed用（trainer2）
      battleRepository.findBattlePokemonMovesByBattlePokemonStatusId
        .mockResolvedValueOnce([battlePokemonMove]) // PPチェック用（trainer1）
        .mockResolvedValueOnce([battlePokemonMove]); // PPチェック用（trainer2）
      battleRepository.findBattlePokemonStatusByBattleId.mockResolvedValue([
        attackerStatus,
        defenderStatus,
      ]);
      battleRepository.update.mockResolvedValue({
        ...battle,
        turn: battle.turn + 1,
      });

      const params: ExecuteTurnParams = {
        battleId,
        trainer1Action: { trainerId: trainer1Id, moveId: move.id },
        trainer2Action: { trainerId: trainer2Id, moveId: move.id },
      };

      // Act
      const result = await useCase.execute(params);

      // Assert
      expect(result.actions.some(a => a.result === 'Move has no PP left')).toBe(true);
      // determineActionOrderでは技情報を取得するが、executeMoveは呼ばれない
      // moveRepository.findByIdはdetermineActionOrderで2回呼ばれる（trainer1とtrainer2）
      expect(moveRepository.findById).toHaveBeenCalledTimes(2);
      // executeMoveは呼ばれないため、PP消費は行われない
      expect(battleRepository.updateBattlePokemonMove).not.toHaveBeenCalled();
    });

    it('技使用時にPPを1消費する', async () => {
      // Arrange
      const battle = new Battle(
        battleId,
        trainer1Id,
        trainer2Id,
        1,
        2,
        1,
        Weather.None,
        Field.None,
        BattleStatus.Active,
        null,
      );

      const attackerStatus = new BattlePokemonStatus(
        1,
        battleId,
        101,
        trainer1Id,
        true,
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

      const defenderStatus = new BattlePokemonStatus(
        2,
        battleId,
        102,
        trainer2Id,
        true,
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

      const move = new Move(
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

      const battlePokemonMove = new BattlePokemonMove(1, attackerStatus.id, move.id, 10, 15);
      const battlePokemonMoveAfterConsumption = new BattlePokemonMove(
        1,
        attackerStatus.id,
        move.id,
        9,
        15,
      );

      const trainedPokemon1 = new TrainedPokemon(
        101,
        trainer1Id,
        new Pokemon(
          1,
          1,
          'ポケモン1',
          'Pokemon1',
          new Type(1, 'ノーマル', 'Normal'),
          null,
          100,
          50,
          50,
          50,
          50,
          50,
        ),
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

      const trainedPokemon2 = new TrainedPokemon(
        102,
        trainer2Id,
        new Pokemon(
          2,
          2,
          'ポケモン2',
          'Pokemon2',
          new Type(1, 'ノーマル', 'Normal'),
          null,
          100,
          50,
          50,
          50,
          50,
          50,
        ),
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

      battleRepository.findById.mockResolvedValue(battle);
      battleRepository.findActivePokemonByBattleIdAndTrainerId
        .mockResolvedValueOnce(attackerStatus)
        .mockResolvedValueOnce(defenderStatus);
      battleRepository.findBattlePokemonMovesByBattlePokemonStatusId
        .mockResolvedValueOnce([battlePokemonMove]) // PPチェック用
        .mockResolvedValueOnce([battlePokemonMove]); // PPチェック用（trainer2）
      // determineActionOrderで技の優先度を取得するため
      moveRepository.findById
        .mockResolvedValueOnce(move) // determineActionOrder用（trainer1）
        .mockResolvedValueOnce(move) // determineActionOrder用（trainer2）
        .mockResolvedValueOnce(move) // executeMove用（trainer1）
        .mockResolvedValueOnce(move); // executeMove用（trainer2）
      // determineActionOrderで特性による優先度補正のためにTrainedPokemonを取得
      // getEffectiveSpeedで速度計算のためにTrainedPokemonを取得
      // executeMoveで命中率判定のためにTrainedPokemonを取得
      trainedPokemonRepository.findById
        .mockResolvedValueOnce(trainedPokemon1) // determineActionOrder用（trainer1、優先度補正）
        .mockResolvedValueOnce(trainedPokemon2) // determineActionOrder用（trainer2、優先度補正）
        .mockResolvedValueOnce(trainedPokemon1) // getEffectiveSpeed用（trainer1）
        .mockResolvedValueOnce(trainedPokemon2) // getEffectiveSpeed用（trainer2）
        .mockResolvedValueOnce(trainedPokemon1) // executeMove用（trainer1、attacker）
        .mockResolvedValueOnce(trainedPokemon2) // executeMove用（trainer1、defender）
        .mockResolvedValueOnce(trainedPokemon1) // executeMove用（trainer2、attacker）
        .mockResolvedValueOnce(trainedPokemon2); // executeMove用（trainer2、defender）
      typeEffectivenessRepository.getTypeEffectivenessMap.mockResolvedValue(new Map());
      battleRepository.findBattlePokemonStatusByBattleId.mockResolvedValue([
        attackerStatus,
        defenderStatus,
      ]);
      battleRepository.findBattlePokemonMoveById
        .mockResolvedValueOnce(battlePokemonMove) // consumePp用（trainer1）
        .mockResolvedValueOnce(battlePokemonMove); // consumePp用（trainer2）
      battleRepository.updateBattlePokemonMove.mockResolvedValue(battlePokemonMoveAfterConsumption);
      battleRepository.update.mockResolvedValue({
        ...battle,
        turn: battle.turn + 1,
      });

      // Math.randomをモックして命中率100%にする
      jest.spyOn(Math, 'random').mockReturnValue(0.5);

      const params: ExecuteTurnParams = {
        battleId,
        trainer1Action: { trainerId: trainer1Id, moveId: move.id },
        trainer2Action: { trainerId: trainer2Id, moveId: move.id },
      };

      // Act
      await useCase.execute(params);

      // Assert
      // PPが消費されていることを確認（2回の技使用で2回呼ばれる）
      expect(battleRepository.updateBattlePokemonMove).toHaveBeenCalledTimes(2);
      expect(battleRepository.updateBattlePokemonMove).toHaveBeenCalledWith(1, {
        currentPp: 9,
      });

      jest.spyOn(Math, 'random').mockRestore();
    });

    it('技が外れた場合でもPPを消費する', async () => {
      // Arrange
      const battle = new Battle(
        battleId,
        trainer1Id,
        trainer2Id,
        1,
        2,
        1,
        Weather.None,
        Field.None,
        BattleStatus.Active,
        null,
      );

      const attackerStatus = new BattlePokemonStatus(
        1,
        battleId,
        101,
        trainer1Id,
        true,
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

      const defenderStatus = new BattlePokemonStatus(
        2,
        battleId,
        102,
        trainer2Id,
        true,
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

      // 命中率50%の技
      const move = new Move(
        1,
        'かえんほうしゃ',
        'Flamethrower',
        new Type(1, 'ほのお', 'Fire'),
        MoveCategory.Special,
        90,
        50,
        15,
        0,
        null,
      );

      const battlePokemonMove = new BattlePokemonMove(1, attackerStatus.id, move.id, 10, 15);
      const battlePokemonMoveAfterConsumption = new BattlePokemonMove(
        1,
        attackerStatus.id,
        move.id,
        9,
        15,
      );

      const trainedPokemon1 = new TrainedPokemon(
        101,
        trainer1Id,
        new Pokemon(
          1,
          1,
          'ポケモン1',
          'Pokemon1',
          new Type(1, 'ノーマル', 'Normal'),
          null,
          100,
          50,
          50,
          50,
          50,
          50,
        ),
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

      const trainedPokemon2 = new TrainedPokemon(
        102,
        trainer2Id,
        new Pokemon(
          2,
          2,
          'ポケモン2',
          'Pokemon2',
          new Type(1, 'ノーマル', 'Normal'),
          null,
          100,
          50,
          50,
          50,
          50,
          50,
        ),
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

      battleRepository.findById.mockResolvedValue(battle);
      battleRepository.findActivePokemonByBattleIdAndTrainerId
        .mockResolvedValueOnce(attackerStatus)
        .mockResolvedValueOnce(defenderStatus);
      battleRepository.findBattlePokemonMovesByBattlePokemonStatusId
        .mockResolvedValueOnce([battlePokemonMove])
        .mockResolvedValueOnce([battlePokemonMove]);
      // determineActionOrderで技の優先度を取得するため
      moveRepository.findById
        .mockResolvedValueOnce(move) // determineActionOrder用（trainer1）
        .mockResolvedValueOnce(move) // determineActionOrder用（trainer2）
        .mockResolvedValueOnce(move) // executeMove用（trainer1）
        .mockResolvedValueOnce(move); // executeMove用（trainer2）
      // determineActionOrderで特性による優先度補正のためにTrainedPokemonを取得
      // getEffectiveSpeedで速度計算のためにTrainedPokemonを取得
      // executeMoveで命中率判定のためにTrainedPokemonを取得
      trainedPokemonRepository.findById
        .mockResolvedValueOnce(trainedPokemon1) // determineActionOrder用（trainer1、優先度補正）
        .mockResolvedValueOnce(trainedPokemon2) // determineActionOrder用（trainer2、優先度補正）
        .mockResolvedValueOnce(trainedPokemon1) // getEffectiveSpeed用（trainer1）
        .mockResolvedValueOnce(trainedPokemon2) // getEffectiveSpeed用（trainer2）
        .mockResolvedValueOnce(trainedPokemon1) // executeMove用（trainer1、attacker）
        .mockResolvedValueOnce(trainedPokemon2) // executeMove用（trainer1、defender）
        .mockResolvedValueOnce(trainedPokemon1) // executeMove用（trainer2、attacker）
        .mockResolvedValueOnce(trainedPokemon2); // executeMove用（trainer2、defender）
      typeEffectivenessRepository.getTypeEffectivenessMap.mockResolvedValue(new Map());
      battleRepository.findBattlePokemonStatusByBattleId.mockResolvedValue([
        attackerStatus,
        defenderStatus,
      ]);
      battleRepository.findBattlePokemonMoveById
        .mockResolvedValueOnce(battlePokemonMove) // consumePp用（trainer1）
        .mockResolvedValueOnce(battlePokemonMove); // consumePp用（trainer2）
      battleRepository.updateBattlePokemonMove.mockResolvedValue(battlePokemonMoveAfterConsumption);
      battleRepository.update.mockResolvedValue({
        ...battle,
        turn: battle.turn + 1,
      });

      // Math.randomをモックして外れるようにする（命中率50%なので、0.6を返すと外れる）
      jest.spyOn(Math, 'random').mockReturnValue(0.6);

      const params: ExecuteTurnParams = {
        battleId,
        trainer1Action: { trainerId: trainer1Id, moveId: move.id },
        trainer2Action: { trainerId: trainer2Id, moveId: move.id },
      };

      // Act
      const result = await useCase.execute(params);

      // Assert
      // 技が外れたメッセージが含まれていることを確認
      expect(result.actions.some(a => a.result.includes('but it missed'))).toBe(true);
      // PPが消費されていることを確認（外れてもPPは消費される）
      expect(battleRepository.updateBattlePokemonMove).toHaveBeenCalled();

      jest.spyOn(Math, 'random').mockRestore();
    });
  });
});
