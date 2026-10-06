import { ExecuteTurnUseCase, ExecuteTurnParams } from './execute-turn.use-case';
import { IBattleRepository } from '../../domain/battle.repository.interface';
import { Battle, BattleStatus } from '../../domain/entities/battle.entity';
import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import { BattlePokemonMove } from '../../domain/entities/battle-pokemon-move.entity';
import { StatePatch } from '../../domain/state/state-field-parser';
import { VolatileState, updateVolatileState } from '../../domain/state/volatile-state';
import { Nature } from '../../domain/logic/stat-calculator';
import { ITrainedPokemonRepository } from '@/modules/trainer/domain/trainer.repository.interface';
import { TrainedPokemon, Gender } from '@/modules/trainer/domain/entities/trained-pokemon.entity';
import {
  IMoveRepository,
  ITypeEffectivenessRepository,
} from '@/modules/pokemon/domain/pokemon.repository.interface';
import { Move, MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { Pokemon } from '@/modules/pokemon/domain/entities/pokemon.entity';
import { Type } from '@/modules/pokemon/domain/entities/type.entity';
import {
  ActionOrderDeterminerService,
  ActionOrderParams,
  DeterminedAction,
} from '../services/action-order-determiner.service';
import { WinnerCheckerService } from '../services/winner-checker.service';
import { StatusConditionProcessorService } from '../services/status-condition-processor.service';
import { PokemonSwitcherService } from '../services/pokemon-switcher.service';
import { MoveExecutorService } from '../services/move-executor.service';

const NORMAL = new Type(1, 'ノーマル', 'Normal');
const GHOST = new Type(2, 'ゴースト', 'Ghost');

const move = (id: number, name: string, category = MoveCategory.Physical): Move =>
  new Move(
    id,
    name,
    name,
    NORMAL,
    category,
    category === MoveCategory.Status ? null : 50,
    100,
    10,
    0,
    null,
  );

const TACKLE = move(11, 'たいあたり');
const SCRATCH = move(13, 'ひっかく');
const SWORDS_DANCE = move(14, 'つるぎのまい', MoveCategory.Status);
const GROWL = move(15, 'なきごえ', MoveCategory.Status);
const THRASH = move(16, 'あばれる');
const OPPONENT_MOVE = move(12, 'はたく');
const STRUGGLE = move(165, 'わるあがき');

/**
 * ExecuteTurnUseCase が、一時的な状態から行動を決めることを確かめる
 * 行動順はトレーナー1 → トレーナー2（交代は先）にし、技の処理（executeMove）は呼ばれた引数だけを見る
 */
describe('ExecuteTurnUseCase - 一時的な状態による行動の決定', () => {
  const createStatus = (id: number, trainerId: number, isActive = true): BattlePokemonStatus =>
    new BattlePokemonStatus(id, 1, id, trainerId, isActive, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const withVolatile = (status: BattlePokemonStatus, volatileState: VolatileState) =>
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
      status.statusCondition,
      volatileState,
    );

  const trainedPokemon = (id: number, type: Type): TrainedPokemon =>
    new TrainedPokemon(
      id,
      id,
      new Pokemon(id, id, 'テスト', 'Test', type, null, 100, 100, 100, 100, 100, 100),
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

  const setup = (
    options: {
      movesOf1?: BattlePokemonMove[];
      volatileOf1?: VolatileState;
      volatileOf2?: VolatileState;
      typeOf1?: Type;
    } = {},
  ) => {
    const battle = new Battle(1, 1, 2, 1, 2, 3, null, null, BattleStatus.Active, null);
    const statuses = new Map<number, BattlePokemonStatus>([
      [1, withVolatile(createStatus(1, 1), options.volatileOf1 ?? {})],
      [2, withVolatile(createStatus(2, 2), options.volatileOf2 ?? {})],
      [10, createStatus(10, 1, false)],
    ]);
    const movesByStatus = new Map<number, BattlePokemonMove[]>([
      [1, options.movesOf1 ?? [new BattlePokemonMove(1, 1, TACKLE.id, 10, 10)]],
      [2, [new BattlePokemonMove(2, 2, OPPONENT_MOVE.id, 10, 10)]],
    ]);
    const allMoves = [TACKLE, SCRATCH, SWORDS_DANCE, GROWL, THRASH, OPPONENT_MOVE, STRUGGLE];

    const battleRepository: jest.Mocked<IBattleRepository> = {
      findById: jest.fn().mockResolvedValue(battle),
      create: jest.fn(),
      update: jest.fn().mockResolvedValue(battle),
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
      findBattlePokemonStatusById: jest.fn((id: number) => Promise.resolve(statuses.get(id))),
      findBattlePokemonMovesByBattlePokemonStatusId: jest.fn((statusId: number) =>
        Promise.resolve(movesByStatus.get(statusId) ?? []),
      ),
      createBattlePokemonMove: jest.fn(),
      updateBattlePokemonMove: jest.fn(),
      findBattlePokemonMoveById: jest.fn(),
      patchVolatileState: jest.fn((id: number, patch: StatePatch<VolatileState>) => {
        const updated = withVolatile(
          statuses.get(id),
          updateVolatileState(statuses.get(id).volatileState, patch),
        );
        statuses.set(id, updated);
        return Promise.resolve(updated);
      }),
      patchPersistentState: jest.fn(),
      patchSideConditions: jest.fn(),
      patchGlobalFieldState: jest.fn(),
    };
    const trainedPokemonRepository: jest.Mocked<ITrainedPokemonRepository> = {
      findById: jest.fn((id: number) =>
        Promise.resolve(trainedPokemon(id, id === 1 ? (options.typeOf1 ?? NORMAL) : NORMAL)),
      ),
      findByTrainerId: jest.fn(),
    };
    const moveRepository: jest.Mocked<IMoveRepository> = {
      findById: jest.fn((id: number) => Promise.resolve(allMoves.find(m => m.id === id) ?? null)),
      findByPokemonId: jest.fn(),
      findByName: jest.fn((name: string) =>
        Promise.resolve(allMoves.find(m => m.name === name) ?? null),
      ),
    };
    const typeEffectivenessRepository: jest.Mocked<ITypeEffectivenessRepository> = {
      getTypeEffectivenessMap: jest.fn(),
      findTypeByName: jest.fn(),
    };

    const actionOrderDeterminer = new ActionOrderDeterminerService(
      moveRepository,
      trainedPokemonRepository,
    );
    // 交代を先に、そのあとトレーナー1 → トレーナー2 の順にする
    const determine = jest
      .spyOn(actionOrderDeterminer, 'determine')
      .mockImplementation((params: ActionOrderParams) => {
        const all = [params.trainer1Action, params.trainer2Action];
        const actions: DeterminedAction[] = [
          ...all
            .filter(a => a.switchPokemonId)
            .map(a => ({
              trainerId: a.trainerId,
              action: 'switch' as const,
              switchPokemonId: a.switchPokemonId,
            })),
          ...all
            .filter(a => a.moveId && !a.switchPokemonId)
            .map(a => ({ trainerId: a.trainerId, action: 'move' as const, moveId: a.moveId })),
        ];
        return Promise.resolve(actions);
      });
    const winnerChecker = new WinnerCheckerService(battleRepository);
    const checkWinner = jest.spyOn(winnerChecker, 'checkWinner').mockResolvedValue(null);
    const statusConditionProcessor = new StatusConditionProcessorService(
      battleRepository,
      trainedPokemonRepository,
    );
    const processTurnEndAbilities = jest
      .spyOn(statusConditionProcessor, 'processTurnEndAbilities')
      .mockResolvedValue();
    const pokemonSwitcher = new PokemonSwitcherService(battleRepository, trainedPokemonRepository);
    const executeSwitch = jest.spyOn(pokemonSwitcher, 'executeSwitch').mockResolvedValue();
    const moveExecutor = new MoveExecutorService(
      battleRepository,
      trainedPokemonRepository,
      moveRepository,
      typeEffectivenessRepository,
    );
    const executeMove = jest.spyOn(moveExecutor, 'executeMove').mockResolvedValue('ok');
    const executeFutureAttacks = jest.spyOn(moveExecutor, 'executeFutureAttacks');

    const useCase = new ExecuteTurnUseCase(
      battleRepository,
      actionOrderDeterminer,
      winnerChecker,
      statusConditionProcessor,
      pokemonSwitcher,
      moveExecutor,
    );
    const calls = () =>
      executeMove.mock.calls.map(([, trainerId, moveId, , , battlePokemonMoveId, opts]) => ({
        trainerId,
        moveId,
        battlePokemonMoveId,
        defenderPendingMoveId: opts?.defenderPendingMoveId,
      }));
    return {
      useCase,
      executeMove,
      executeSwitch,
      executeFutureAttacks,
      determine,
      moveExecutor,
      statuses,
      calls,
      checkWinner,
      processTurnEndAbilities,
      battleRepository,
    };
  };

  const params = (trainer1Action: ExecuteTurnParams['trainer1Action']): ExecuteTurnParams => ({
    battleId: 1,
    trainer1Action,
    trainer2Action: { trainerId: 2, moveId: OPPONENT_MOVE.id },
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('選んだ行動の代わりに出す技', () => {
    it('反動で動けないときは、交代を選んでも反動の技を出す（技を出す前の判定で止まる）', async () => {
      // Arrange
      const { useCase, calls, executeSwitch } = setup({
        volatileOf1: { mustRecharge: true, lastMoveId: TACKLE.id },
      });

      // Act
      await useCase.execute(params({ trainerId: 1, switchPokemonId: 10 }));

      // Assert
      expect(executeSwitch).not.toHaveBeenCalled();
      expect(calls()[0]).toMatchObject({ trainerId: 1, moveId: TACKLE.id });
    });

    it('ため技の 2 ターン目は、選んだ技ではなくためている技を出す', async () => {
      // Arrange
      const { useCase, calls } = setup({
        movesOf1: [
          new BattlePokemonMove(1, 1, TACKLE.id, 10, 10),
          new BattlePokemonMove(3, 1, SCRATCH.id, 10, 10),
        ],
        volatileOf1: { chargingMoveId: SCRATCH.id },
      });

      // Act
      await useCase.execute(params({ trainerId: 1, moveId: TACKLE.id }));

      // Assert
      expect(calls()[0]).toMatchObject({ moveId: SCRATCH.id, battlePokemonMoveId: 3 });
    });

    it('覚えていない技を出し続けるとき（ゆびをふるで出たあばれる）は、技の欄を渡さない', async () => {
      // Arrange
      const { useCase, calls } = setup({
        volatileOf1: { lockedInMove: { moveId: THRASH.id, turns: 1 } },
      });

      // Act
      await useCase.execute(params({ trainerId: 1, moveId: TACKLE.id }));

      // Assert
      expect(calls()[0]).toMatchObject({ moveId: THRASH.id, battlePokemonMoveId: undefined });
    });

    it('アンコール中は、選んだ技にかかわらずアンコールされた技を出す', async () => {
      // Arrange
      const { useCase, calls } = setup({
        movesOf1: [
          new BattlePokemonMove(1, 1, TACKLE.id, 10, 10),
          new BattlePokemonMove(3, 1, SCRATCH.id, 10, 10),
        ],
        volatileOf1: { encore: { moveId: SCRATCH.id, turns: 2 } },
      });

      // Act
      await useCase.execute(params({ trainerId: 1, moveId: TACKLE.id }));

      // Assert
      expect(calls()[0]).toMatchObject({ moveId: SCRATCH.id, battlePokemonMoveId: 3 });
    });

    it('アンコール中でも、交代はできる', async () => {
      // Arrange
      const { useCase, executeSwitch } = setup({
        volatileOf1: { encore: { moveId: TACKLE.id, turns: 2 } },
      });

      // Act
      await useCase.execute(params({ trainerId: 1, switchPokemonId: 10 }));

      // Assert
      expect(executeSwitch).toHaveBeenCalledTimes(1);
    });

    it('アンコールされた技の PP が 0 なら、アンコールが解けて選んだ技を出す', async () => {
      // Arrange
      const { useCase, calls, statuses } = setup({
        movesOf1: [
          new BattlePokemonMove(1, 1, TACKLE.id, 10, 10),
          new BattlePokemonMove(3, 1, SCRATCH.id, 0, 10),
        ],
        volatileOf1: { encore: { moveId: SCRATCH.id, turns: 2 } },
      });

      // Act
      await useCase.execute(params({ trainerId: 1, moveId: TACKLE.id }));

      // Assert
      expect(calls()[0]).toMatchObject({ moveId: TACKLE.id });
      expect(statuses.get(1).volatileState.encore).toBeUndefined();
    });
  });

  describe('技の欄', () => {
    it('ものまねで入れ替わった技を選べる（入れ替える前の欄の ID を渡す）', async () => {
      // Arrange
      const { useCase, calls } = setup({
        volatileOf1: {
          moveSlotOverrides: [
            { battlePokemonMoveId: 1, moveId: SCRATCH.id, currentPp: 5, maxPp: 5 },
          ],
        },
      });

      // Act
      await useCase.execute(params({ trainerId: 1, moveId: SCRATCH.id }));

      // Assert
      expect(calls()[0]).toMatchObject({ moveId: SCRATCH.id, battlePokemonMoveId: 1 });
    });

    it('すべての技の PP が 0 なら、わるあがきを出す', async () => {
      // Arrange
      const { useCase, calls, determine } = setup({
        movesOf1: [new BattlePokemonMove(1, 1, TACKLE.id, 0, 10)],
      });

      // Act
      await useCase.execute(params({ trainerId: 1, moveId: TACKLE.id }));

      // Assert
      expect(calls()[0]).toMatchObject({ moveId: STRUGGLE.id, battlePokemonMoveId: undefined });
      expect(determine.mock.calls[0][0].trainer1Action.moveId).toBe(STRUGGLE.id);
    });

    it('ほかに PP の残っている技があれば、PP が 0 の技は出せない', async () => {
      // Arrange
      const { useCase, executeMove } = setup({
        movesOf1: [
          new BattlePokemonMove(1, 1, TACKLE.id, 0, 10),
          new BattlePokemonMove(3, 1, SCRATCH.id, 5, 10),
        ],
      });

      // Act
      const result = await useCase.execute(params({ trainerId: 1, moveId: TACKLE.id }));

      // Assert
      expect(result.actions[0]).toEqual({
        trainerId: 1,
        action: 'move',
        result: 'Move has no PP left',
      });
      expect(executeMove).toHaveBeenCalledTimes(1);
    });

    it('選んだ技がちょうはつで出せず、ほかに出せる技もなければ、わるあがきを出す', async () => {
      // Arrange
      const { useCase, calls } = setup({
        movesOf1: [
          new BattlePokemonMove(1, 1, SWORDS_DANCE.id, 10, 10),
          new BattlePokemonMove(3, 1, GROWL.id, 10, 10),
        ],
        volatileOf1: { tauntTurns: 2 },
      });

      // Act
      await useCase.execute(params({ trainerId: 1, moveId: SWORDS_DANCE.id }));

      // Assert
      expect(calls()[0]).toMatchObject({ moveId: STRUGGLE.id });
    });

    it('選んだ技がちょうはつで出せなくても、ほかに出せる技があれば選んだ技のまま（技を出す前の判定で止まる）', async () => {
      // Arrange
      const { useCase, calls } = setup({
        movesOf1: [
          new BattlePokemonMove(1, 1, SWORDS_DANCE.id, 10, 10),
          new BattlePokemonMove(3, 1, TACKLE.id, 10, 10),
        ],
        volatileOf1: { tauntTurns: 2 },
      });

      // Act
      await useCase.execute(params({ trainerId: 1, moveId: SWORDS_DANCE.id }));

      // Assert
      expect(calls()[0]).toMatchObject({ moveId: SWORDS_DANCE.id });
    });
  });

  describe('相手の行動', () => {
    it('相手がこのターンにまだ技を出していなければ、相手の技の ID を渡す（さきどり・ふいうち）', async () => {
      // Arrange
      const { useCase, calls } = setup();

      // Act
      await useCase.execute(params({ trainerId: 1, moveId: TACKLE.id }));

      // Assert
      expect(calls()[0].defenderPendingMoveId).toBe(OPPONENT_MOVE.id);
      expect(calls()[1].defenderPendingMoveId).toBeUndefined();
    });
  });

  describe('ターンの初めの効果', () => {
    it('技の onTurnStart を行動順に呼び、メッセージを行動の結果に入れる', async () => {
      // Arrange
      const { useCase, moveExecutor } = setup();
      const runTurnStartHook = jest
        .spyOn(moveExecutor, 'runTurnStartHook')
        .mockResolvedValueOnce('started heating up its beak!')
        .mockResolvedValueOnce(null);

      // Act
      const result = await useCase.execute(params({ trainerId: 1, moveId: TACKLE.id }));

      // Assert
      expect(runTurnStartHook.mock.calls.map(([, moveId]) => moveId)).toEqual([
        TACKLE.id,
        OPPONENT_MOVE.id,
      ]);
      expect(result.actions[0]).toEqual({
        trainerId: 1,
        action: 'turnStart',
        result: 'started heating up its beak!',
      });
    });
  });

  describe('交代の制限', () => {
    it('逃げられない状態（trappedByStatusId）では交代できない', async () => {
      // Arrange
      const { useCase, executeSwitch } = setup({ volatileOf1: { trappedByStatusId: 2 } });

      // Act
      const result = await useCase.execute(params({ trainerId: 1, switchPokemonId: 10 }));

      // Assert
      expect(executeSwitch).not.toHaveBeenCalled();
      expect(result.actions[0]).toEqual({
        trainerId: 1,
        action: 'switch',
        result: 'Cannot switch out because it is trapped',
      });
    });

    it('ゴーストタイプは、逃げられない状態でも交代できる', async () => {
      // Arrange
      const { useCase, executeSwitch } = setup({
        volatileOf1: { partialTrap: { sourceStatusId: 2, moveId: 1, turns: 3 } },
        typeOf1: GHOST,
      });

      // Act
      await useCase.execute(params({ trainerId: 1, switchPokemonId: 10 }));

      // Assert
      expect(executeSwitch).toHaveBeenCalledTimes(1);
    });

    it('ねをはっていると、ゴーストタイプでも交代できない', async () => {
      // Arrange
      const { useCase, executeSwitch } = setup({
        volatileOf1: { ingrain: true },
        typeOf1: GHOST,
      });

      // Act
      await useCase.execute(params({ trainerId: 1, switchPokemonId: 10 }));

      // Assert
      expect(executeSwitch).not.toHaveBeenCalled();
    });
  });

  const faint = (status: BattlePokemonStatus): BattlePokemonStatus =>
    new BattlePokemonStatus(
      status.id,
      status.battleId,
      status.trainedPokemonId,
      status.trainerId,
      status.isActive,
      0,
      status.maxHp,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      status.statusCondition,
      status.volatileState,
    );

  describe('ひんしになったポケモンを指す状態', () => {
    it('相手を技で倒すと、その相手による逃げられない状態・バインド・メロメロが消える', async () => {
      // Arrange
      const { useCase, executeMove, statuses } = setup({
        volatileOf1: {
          trappedByStatusId: 2,
          octolock: true,
          partialTrap: { sourceStatusId: 2, moveId: 1, turns: 3 },
          infatuatedWithStatusId: 2,
        },
      });
      executeMove.mockImplementation((_battle, trainerId) => {
        if (trainerId === 1) {
          statuses.set(2, faint(statuses.get(2)));
        }
        return Promise.resolve('ok');
      });

      // Act
      await useCase.execute(params({ trainerId: 1, moveId: TACKLE.id }));

      // Assert
      expect(statuses.get(1).volatileState).toEqual({});
    });

    it('しめつけたポケモン・逃げられなくしたポケモンがひんしなら、交代できる', async () => {
      // Arrange
      const { useCase, executeSwitch, statuses } = setup({
        volatileOf1: {
          trappedByStatusId: 2,
          partialTrap: { sourceStatusId: 2, moveId: 1, turns: 3 },
        },
      });
      statuses.set(2, faint(statuses.get(2)));

      // Act
      await useCase.execute(params({ trainerId: 1, switchPokemonId: 10 }));

      // Assert
      expect(executeSwitch).toHaveBeenCalledTimes(1);
    });
  });

  describe('ひんしと勝敗', () => {
    it('先に行動した相手に倒されたポケモンは、技を出さない', async () => {
      // Arrange
      const { useCase, executeMove, statuses, calls } = setup();
      executeMove.mockImplementation((_battle, trainerId) => {
        if (trainerId === 1) {
          statuses.set(2, faint(statuses.get(2)));
        }
        return Promise.resolve('ok');
      });

      // Act
      const result = await useCase.execute(params({ trainerId: 1, moveId: TACKLE.id }));

      // Assert
      expect(calls()).toHaveLength(1);
      expect(result.actions.filter(a => a.action === 'move')).toHaveLength(1);
    });

    it('ターン終了時の処理（ほろびのうたなど）で最後のポケモンが倒れたら、そのターンで勝敗が決まる', async () => {
      // Arrange
      const { useCase, statuses, checkWinner, processTurnEndAbilities, battleRepository } = setup();
      checkWinner.mockRestore();
      processTurnEndAbilities.mockImplementation(() => {
        statuses.set(2, faint(statuses.get(2)));
        return Promise.resolve();
      });

      // Act
      const result = await useCase.execute(params({ trainerId: 1, moveId: TACKLE.id }));

      // Assert
      expect(result.winnerTrainerId).toBe(1);
      expect(battleRepository.update).toHaveBeenCalledWith(1, {
        status: BattleStatus.Completed,
        winnerTrainerId: 1,
      });
      expect(battleRepository.update).not.toHaveBeenCalledWith(
        1,
        expect.objectContaining({ turn: expect.any(Number) }),
      );
    });

    it('みらいよちで最後のポケモンが倒れたら、そのターンで勝敗が決まる', async () => {
      // Arrange
      const { useCase, statuses, checkWinner, executeFutureAttacks } = setup();
      checkWinner.mockRestore();
      executeFutureAttacks.mockImplementation(() => {
        statuses.set(2, faint(statuses.get(2)));
        return Promise.resolve([]);
      });

      // Act
      const result = await useCase.execute(params({ trainerId: 1, moveId: TACKLE.id }));

      // Assert
      expect(result.winnerTrainerId).toBe(1);
    });
  });

  describe('ターン終了時', () => {
    it('みらいよちを当てる処理を呼ぶ', async () => {
      // Arrange
      const { useCase, executeFutureAttacks } = setup();

      // Act
      await useCase.execute(params({ trainerId: 1, moveId: TACKLE.id }));

      // Assert
      expect(executeFutureAttacks).toHaveBeenCalledTimes(1);
    });
  });
});
