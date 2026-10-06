import { MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { PunishmentEffect } from '@/modules/pokemon/domain/moves/effects/punishment-effect';
import { PowerTripEffect } from '@/modules/pokemon/domain/moves/effects/power-trip-effect';
import { FacadeEffect } from '@/modules/pokemon/domain/moves/effects/facade-effect';
import { StatusCondition } from '../../domain/entities/status-condition.enum';
import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import {
  ATTACKER_ID,
  DEFENDER_ID,
  createMove,
  setupMoveExecutor,
  withChanges,
} from './__tests__/move-executor-test-setup';

/**
 * ターンの途中で変わったランクや状態異常を見て威力を決めるかを確かめる
 * （executeMove に渡る状態はターン開始時のもので、リポジトリには先に動いた側の変化が入っている）
 */
describe('MoveExecutorService - 威力を決める技は最新の状態を見る', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * リポジトリだけが、ターンの途中で変わった状態を返すようにする
   */
  const updateOnlyInRepository = (
    setup: ReturnType<typeof setupMoveExecutor>,
    id: number,
    changes: Partial<BattlePokemonStatus>,
  ) => {
    const { statuses, battleRepository } = setup;
    battleRepository.findBattlePokemonStatusById.mockImplementation((statusId: number) => {
      const status = statuses.get(statusId);
      if (!status) return Promise.resolve(null);
      return Promise.resolve(statusId === id ? withChanges(status, changes) : status);
    });
  };

  it('おしおき: 先に相手がこうげきを2段階上げていたら、威力は100になる', async () => {
    // Arrange
    const setup = setupMoveExecutor({
      move: createMove('おしおき', MoveCategory.Physical, null),
      moveEffect: new PunishmentEffect(),
    });
    updateOnlyInRepository(setup, DEFENDER_ID, { attackRank: 2 });

    // Act
    await setup.execute();

    // Assert
    expect(setup.calculate.mock.calls[0][0].move.power).toBe(100);
  });

  it('つけあがる: 先に自分のこうげきが2段階上がっていたら、威力は60になる', async () => {
    // Arrange
    const setup = setupMoveExecutor({
      move: createMove('つけあがる', MoveCategory.Physical, 20),
      moveEffect: new PowerTripEffect(),
    });
    updateOnlyInRepository(setup, ATTACKER_ID, { attackRank: 2 });

    // Act
    await setup.execute();

    // Assert
    expect(setup.calculate.mock.calls[0][0].move.power).toBe(60);
  });

  it('からげんき: 先に相手の技でやけどになっていたら、威力は140になる', async () => {
    // Arrange
    const setup = setupMoveExecutor({
      move: createMove('からげんき', MoveCategory.Physical, 70),
      moveEffect: new FacadeEffect(),
    });
    updateOnlyInRepository(setup, ATTACKER_ID, { statusCondition: StatusCondition.Burn });

    // Act
    await setup.execute();

    // Assert
    expect(setup.calculate.mock.calls[0][0].move.power).toBe(140);
  });

  it('からげんき: このターンにこおりが溶けていたら、威力は70のまま', async () => {
    // Arrange
    const setup = setupMoveExecutor({
      move: createMove('からげんき', MoveCategory.Physical, 70),
      moveEffect: new FacadeEffect(),
      attacker: { statusCondition: StatusCondition.Freeze },
    });
    updateOnlyInRepository(setup, ATTACKER_ID, { statusCondition: StatusCondition.None });

    // Act
    await setup.execute();

    // Assert
    expect(setup.calculate.mock.calls[0][0].move.power).toBe(70);
  });
});
