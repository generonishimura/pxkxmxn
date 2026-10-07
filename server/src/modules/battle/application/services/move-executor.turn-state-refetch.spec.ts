import { MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { StatusCondition } from '../../domain/entities/status-condition.enum';
import {
  ATTACKER_ID,
  DEFENDER_ID,
  createMove,
  setupMoveExecutor,
  withChanges,
} from './__tests__/move-executor-test-setup';

/**
 * executeMove に渡る状態はターン開始時のもので、リポジトリには先に動いた側の変化が入っている。
 * 効果を持たない普通の技でも、技を出す前に最新の状態を読み直すかを確かめる
 */
describe('MoveExecutorService - 技を出す前に最新の状態を読み直す', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * ターン開始時の状態を executeMove に渡し、リポジトリだけを先に動いた側の変化に更新してから技を出す
   */
  const executeWithStaleStatuses = async (
    setup: ReturnType<typeof setupMoveExecutor>,
    id: number,
    changes: Parameters<typeof withChanges>[1],
  ) => {
    const staleAttacker = setup.statuses.get(ATTACKER_ID)!;
    const staleDefender = setup.statuses.get(DEFENDER_ID)!;
    setup.statuses.set(id, withChanges(setup.statuses.get(id)!, changes));
    return setup.service.executeMove(setup.battle, ATTACKER_ID, 1, staleAttacker, staleDefender, 1);
  };

  it('先に相手が反動で HP 70 になっていたら、普通の技のダメージは 70 から引く（100 に戻さない）', async () => {
    // Arrange
    const setup = setupMoveExecutor({
      move: createMove('たいあたり', MoveCategory.Physical, 40),
      damage: 10,
    });

    // Act
    await executeWithStaleStatuses(setup, DEFENDER_ID, { currentHp: 70 });

    // Assert
    expect(setup.statuses.get(DEFENDER_ID)!.currentHp).toBe(60);
  });

  it('先に相手の技でまひになっていたら、技を出す前のまひの判定をする（しびれて動けなければダメージを与えない）', async () => {
    // Arrange
    const setup = setupMoveExecutor({
      move: createMove('たいあたり', MoveCategory.Physical, 40),
      damage: 10,
    });
    // まひで動けない判定（25%）に必ず当たるようにする
    jest.spyOn(Math, 'random').mockReturnValue(0);

    // Act
    await executeWithStaleStatuses(setup, ATTACKER_ID, {
      statusCondition: StatusCondition.Paralysis,
    });

    // Assert
    expect(setup.statuses.get(DEFENDER_ID)!.currentHp).toBe(100);
  });
});
