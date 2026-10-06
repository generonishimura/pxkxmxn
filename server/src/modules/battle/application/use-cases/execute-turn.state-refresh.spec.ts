import { ExecuteTurnUseCase } from './execute-turn.use-case';
import { IBattleRepository } from '../../domain/battle.repository.interface';
import { Battle, BattleStatus, Weather } from '../../domain/entities/battle.entity';
import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import { BattlePokemonMove } from '../../domain/entities/battle-pokemon-move.entity';
import { VolatileState } from '../../domain/state/volatile-state';
import { SideState } from '../../domain/state/side-state';
import { ITrainedPokemonRepository } from '@/modules/trainer/domain/trainer.repository.interface';
import {
  IMoveRepository,
  ITypeEffectivenessRepository,
} from '@/modules/pokemon/domain/pokemon.repository.interface';
import {
  ActionOrderDeterminerService,
  DeterminedAction,
} from '../services/action-order-determiner.service';
import { WinnerCheckerService } from '../services/winner-checker.service';
import { StatusConditionProcessorService } from '../services/status-condition-processor.service';
import { PokemonSwitcherService } from '../services/pokemon-switcher.service';
import { MoveExecutorService } from '../services/move-executor.service';

/**
 * 行動のたびに、バトルと場のポケモンを読み直すことを確かめる
 * リポジトリはメモリ上で状態を持ち、先に行動した側の書き込みが後の行動に見えるようにする
 */
describe('ExecuteTurnUseCase - 行動のたびに最新の状態を読む', () => {
  const createStatus = (id: number, trainerId: number, isActive = true): BattlePokemonStatus =>
    new BattlePokemonStatus(id, 1, id, trainerId, isActive, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const withVolatileState = (
    status: BattlePokemonStatus,
    volatileState: VolatileState,
  ): BattlePokemonStatus =>
    new BattlePokemonStatus(
      status.id,
      status.battleId,
      status.trainedPokemonId,
      status.trainerId,
      status.isActive,
      status.currentHp,
      status.maxHp,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      null,
      volatileState,
    );

  const withBattleChanges = (
    battle: Battle,
    changes: { weather?: Weather; sideState?: SideState; turn?: number },
  ): Battle =>
    new Battle(
      battle.id,
      battle.trainer1Id,
      battle.trainer2Id,
      battle.team1Id,
      battle.team2Id,
      changes.turn ?? battle.turn,
      changes.weather ?? battle.weather,
      battle.field,
      battle.status,
      battle.winnerTrainerId,
      changes.sideState ?? battle.sideState,
    );

  const setup = (actions: DeterminedAction[]) => {
    let battle = new Battle(1, 1, 2, 1, 2, 3, null, null, BattleStatus.Active, null);
    const statuses = new Map<number, BattlePokemonStatus>([
      [1, createStatus(1, 1)],
      [2, createStatus(2, 2)],
      [20, createStatus(20, 2, false)],
    ]);

    const battleRepository: jest.Mocked<IBattleRepository> = {
      findById: jest.fn((_id: number) => Promise.resolve(battle)),
      create: jest.fn(),
      update: jest.fn((_id: number, data: Partial<Battle>) => {
        battle = withBattleChanges(battle, data);
        return Promise.resolve(battle);
      }),
      findBattlePokemonStatusByBattleId: jest.fn((_battleId: number) =>
        Promise.resolve([...statuses.values()]),
      ),
      createBattlePokemonStatus: jest.fn(),
      updateBattlePokemonStatus: jest.fn(),
      findActivePokemonByBattleIdAndTrainerId: jest.fn((_battleId: number, trainerId: number) =>
        Promise.resolve(
          [...statuses.values()].find(s => s.trainerId === trainerId && s.isActive) ?? null,
        ),
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
    const processTurnEnd = jest
      .spyOn(statusConditionProcessor, 'processTurnEndAbilities')
      .mockResolvedValue();
    const pokemonSwitcher = new PokemonSwitcherService(battleRepository, trainedPokemonRepository);
    // 交代: トレーナー2 の場のポケモンを ID 20 にする
    jest.spyOn(pokemonSwitcher, 'executeSwitch').mockImplementation(() => {
      statuses.set(2, createStatus(2, 2, false));
      statuses.set(20, createStatus(20, 2, true));
      return Promise.resolve();
    });
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
    const setBattle = (changes: { weather?: Weather; sideState?: SideState }) => {
      battle = withBattleChanges(battle, changes);
    };
    const setVolatileState = (id: number, volatileState: VolatileState) => {
      statuses.set(id, withVolatileState(statuses.get(id), volatileState));
    };
    return { useCase, executeMove, processTurnEnd, battleRepository, setBattle, setVolatileState };
  };

  const bothMove: DeterminedAction[] = [
    { trainerId: 1, action: 'move', moveId: 11 },
    { trainerId: 2, action: 'move', moveId: 12 },
  ];

  const params = {
    battleId: 1,
    trainer1Action: { trainerId: 1, moveId: 11 },
    trainer2Action: { trainerId: 2, moveId: 12 },
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('先に行動した技が書いた volatileState を、後に行動する側は最新の値で受け取る', async () => {
    // Arrange
    const { useCase, executeMove, setVolatileState } = setup(bothMove);
    executeMove.mockImplementationOnce(() => {
      setVolatileState(2, { tauntTurns: 3 });
      return Promise.resolve('ちょうはつ');
    });

    // Act
    await useCase.execute(params);

    // Assert
    const [, , , secondAttacker] = executeMove.mock.calls[1];
    expect(secondAttacker.volatileState).toEqual({ tauntTurns: 3 });
  });

  it('先に行動した技が守りを張ったら、後に行動する相手の技はそれを防御側の最新の値で受け取る', async () => {
    // Arrange
    const { useCase, executeMove, setVolatileState } = setup(bothMove);
    executeMove.mockImplementationOnce(() => {
      setVolatileState(1, { protection: 'protect' });
      return Promise.resolve('まもる');
    });

    // Act
    await useCase.execute(params);

    // Assert
    const [, , , , secondDefender] = executeMove.mock.calls[1];
    expect(secondDefender.volatileState).toEqual({ protection: 'protect' });
  });

  it('先に行動した技が書いた sideState を、後に行動する側は最新のバトルで受け取る', async () => {
    // Arrange
    const { useCase, executeMove, setBattle } = setup(bothMove);
    executeMove.mockImplementationOnce(() => {
      setBattle({ sideState: { sides: { '1': { reflectTurns: 5 } } } });
      return Promise.resolve('リフレクター');
    });

    // Act
    await useCase.execute(params);

    // Assert
    const [secondBattle] = executeMove.mock.calls[1];
    expect(secondBattle.sideState).toEqual({ sides: { '1': { reflectTurns: 5 } } });
  });

  it('相手が先に交代したら、技の相手は交代で出てきたポケモンになる', async () => {
    // Arrange
    const { useCase, executeMove } = setup([
      { trainerId: 2, action: 'switch', switchPokemonId: 20 },
      { trainerId: 1, action: 'move', moveId: 11 },
    ]);

    // Act
    await useCase.execute({
      battleId: 1,
      trainer1Action: { trainerId: 1, moveId: 11 },
      trainer2Action: { trainerId: 2, switchPokemonId: 20 },
    });

    // Assert
    const [, , , attacker, defender] = executeMove.mock.calls[0];
    expect(attacker.id).toBe(1);
    expect(defender.id).toBe(20);
  });

  it('ターン終了時の処理には、行動のあとの最新のバトルを渡す', async () => {
    // Arrange
    const { useCase, executeMove, processTurnEnd, setBattle } = setup(bothMove);
    executeMove.mockImplementationOnce(() => {
      setBattle({ weather: Weather.Rain });
      return Promise.resolve('あまごい');
    });

    // Act
    await useCase.execute(params);

    // Assert
    expect(processTurnEnd.mock.calls[0][0].weather).toBe(Weather.Rain);
  });
});
