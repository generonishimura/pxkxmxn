import { ExecuteTurnUseCase } from './execute-turn.use-case';
import { IBattleRepository } from '../../domain/battle.repository.interface';
import { Battle, BattleStatus } from '../../domain/entities/battle.entity';
import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import { BattlePokemonMove } from '../../domain/entities/battle-pokemon-move.entity';
import { ITrainedPokemonRepository } from '@/modules/trainer/domain/trainer.repository.interface';
import {
  IMoveRepository,
  ITypeEffectivenessRepository,
} from '@/modules/pokemon/domain/pokemon.repository.interface';
import { ActionOrderDeterminerService } from '../services/action-order-determiner.service';
import { WinnerCheckerService } from '../services/winner-checker.service';
import { StatusConditionProcessorService } from '../services/status-condition-processor.service';
import { PokemonSwitcherService } from '../services/pokemon-switcher.service';
import { MoveExecutorService } from '../services/move-executor.service';
import { DeterminedAction } from '../services/action-order-determiner.service';

describe('ExecuteTurnUseCase - 最後に行動するかどうか', () => {
  const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);

  const createStatus = (id: number): BattlePokemonStatus =>
    new BattlePokemonStatus(id, 1, id, id, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const setup = (actions: DeterminedAction[]) => {
    const battleRepository: jest.Mocked<IBattleRepository> = {
      findById: jest.fn().mockResolvedValue(battle),
      create: jest.fn(),
      update: jest.fn().mockResolvedValue(battle),
      findBattlePokemonStatusByBattleId: jest.fn().mockResolvedValue([]),
      createBattlePokemonStatus: jest.fn(),
      updateBattlePokemonStatus: jest.fn(),
      findActivePokemonByBattleIdAndTrainerId: jest.fn((_battleId: number, trainerId: number) =>
        Promise.resolve(createStatus(trainerId)),
      ),
      findBattlePokemonStatusById: jest.fn(),
      findBattlePokemonMovesByBattlePokemonStatusId: jest.fn((statusId: number) =>
        Promise.resolve([new BattlePokemonMove(statusId, statusId, 10 + statusId, 10, 10)]),
      ),
      createBattlePokemonMove: jest.fn(),
      updateBattlePokemonMove: jest.fn(),
      findBattlePokemonMoveById: jest.fn(),
      patchVolatileState: jest.fn(),
      patchPersistentState: jest.fn(),
      patchSideConditions: jest.fn(),
      patchGlobalFieldState: jest.fn(),
    };
    const trainedPokemonRepository: jest.Mocked<ITrainedPokemonRepository> = {
      findById: jest.fn(),
      findByTrainerId: jest.fn(),
    };
    const moveRepository: jest.Mocked<IMoveRepository> = {
      findById: jest.fn(),
      findByPokemonId: jest.fn(),
    };
    const typeEffectivenessRepository: jest.Mocked<ITypeEffectivenessRepository> = {
      getTypeEffectivenessMap: jest.fn(),
      findTypeByName: jest.fn(),
    };

    const actionOrderDeterminer = new ActionOrderDeterminerService(
      moveRepository,
      trainedPokemonRepository,
    );
    jest.spyOn(actionOrderDeterminer, 'determine').mockResolvedValue(actions);
    const winnerChecker = new WinnerCheckerService(battleRepository);
    jest.spyOn(winnerChecker, 'checkWinner').mockResolvedValue(null);
    const statusConditionProcessor = new StatusConditionProcessorService(
      battleRepository,
      trainedPokemonRepository,
    );
    jest.spyOn(statusConditionProcessor, 'processTurnEndAbilities').mockResolvedValue();
    const pokemonSwitcher = new PokemonSwitcherService(battleRepository, trainedPokemonRepository);
    jest.spyOn(pokemonSwitcher, 'executeSwitch').mockResolvedValue();
    const moveExecutor = new MoveExecutorService(
      battleRepository,
      trainedPokemonRepository,
      moveRepository,
      typeEffectivenessRepository,
    );
    const executeMove = jest.spyOn(moveExecutor, 'executeMove').mockResolvedValue('ok');

    const useCase = new ExecuteTurnUseCase(
      battleRepository,
      actionOrderDeterminer,
      winnerChecker,
      statusConditionProcessor,
      pokemonSwitcher,
      moveExecutor,
    );
    return { useCase, executeMove };
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('両方が技を使う場合、後に行動する側だけ isLastToMove が true になる', async () => {
    // Arrange
    const { useCase, executeMove } = setup([
      { trainerId: 1, action: 'move', moveId: 11 },
      { trainerId: 2, action: 'move', moveId: 12 },
    ]);

    // Act
    await useCase.execute({
      battleId: 1,
      trainer1Action: { trainerId: 1, moveId: 11 },
      trainer2Action: { trainerId: 2, moveId: 12 },
    });

    // Assert
    expect(executeMove.mock.calls[0][6]).toEqual({ isLastToMove: false });
    expect(executeMove.mock.calls[1][6]).toEqual({ isLastToMove: true });
  });

  it('相手が交代した場合、技を使う側は最後に行動する扱いになる', async () => {
    // Arrange
    const { useCase, executeMove } = setup([
      { trainerId: 2, action: 'switch', switchPokemonId: 5 },
      { trainerId: 1, action: 'move', moveId: 11 },
    ]);

    // Act
    await useCase.execute({
      battleId: 1,
      trainer1Action: { trainerId: 1, moveId: 11 },
      trainer2Action: { trainerId: 2, switchPokemonId: 5 },
    });

    // Assert
    expect(executeMove.mock.calls[0][6]).toEqual({ isLastToMove: true });
  });
});
