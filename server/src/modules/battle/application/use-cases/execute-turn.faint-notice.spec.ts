import { MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { MoveRegistry } from '@/modules/pokemon/domain/moves/move-registry';
import { StatusCondition } from '../../domain/entities/status-condition.enum';
import {
  HarnessPokemon,
  createBattleEngine,
  createTestMove,
} from '../__tests__/battle-engine-harness';

/**
 * ひんしの通知（エンジン全体）: 原因や陣営に関係なく、ひんしになったことを場の特性（ソウルハート）に知らせる
 * 最大 HP 160。威力 50 の物理技は、実数値 120 どうしでタイプ一致（ノーマル）なら 36 ダメージ
 */
describe('ExecuteTurnUseCase - ひんしを場の特性に知らせる', () => {
  const SPLASH = createTestMove(1, 'はねる', { category: MoveCategory.Status });
  const TACKLE = createTestMove(2, 'たいあたり');
  const DOUBLE_EDGE = createTestMove(3, 'すてみタックル', { power: 120 });
  const MOVES = [SPLASH, TACKLE, DOUBLE_EDGE];
  const ALL_MOVES = MOVES.map(move => move.id);

  /**
   * トレーナー1 の場にソウルハート（ID 1）、トレーナー2 の場に相手（ID 2）と控え（ID 3）
   */
  const setup = (holder: Partial<HarnessPokemon> = {}, foe: Partial<HarnessPokemon> = {}) =>
    createBattleEngine({
      moves: MOVES,
      pokemon: [
        {
          id: 1,
          trainerId: 1,
          active: true,
          moveIds: ALL_MOVES,
          ability: 'ソウルハート',
          ...holder,
        },
        { id: 2, trainerId: 2, active: true, moveIds: ALL_MOVES, ...foe },
        { id: 3, trainerId: 2, moveIds: ALL_MOVES },
      ],
    });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    MoveRegistry.clear();
    MoveRegistry.initialize();
  });

  it('相手が反動でひんしになったら、ソウルハートの特攻が1段階上がる', async () => {
    // Arrange: 相手が先に動き、すてみタックルの反動で倒れる
    const engine = setup({ baseSpeed: 50 }, { currentHp: 1 });

    // Act
    const result = await engine.runTurn({ moveId: SPLASH.id }, { moveId: DOUBLE_EDGE.id });

    // Assert
    expect(engine.status(2).currentHp).toBe(0);
    expect(engine.status(1).specialAttackRank).toBe(1);
    expect(result.actions).toContainEqual({
      trainerId: 1,
      action: 'ability',
      result: 'Special Attack rose!',
    });
  });

  it('相手がターン終了時のどくでひんしになったら、ソウルハートの特攻が1段階上がる', async () => {
    // Arrange: どくのダメージは最大 HP の 1/8（20）
    const engine = setup({}, { currentHp: 10, statusCondition: StatusCondition.Poison });

    // Act
    await engine.runTurn({ moveId: SPLASH.id }, { moveId: SPLASH.id });

    // Assert
    expect(engine.status(2).currentHp).toBe(0);
    expect(engine.status(1).specialAttackRank).toBe(1);
  });

  it('自分の技で相手をひんしにしたら、ソウルハートの特攻は1段階だけ上がる（2回知らせない）', async () => {
    // Arrange
    const engine = setup({}, { currentHp: 1, baseSpeed: 50 });

    // Act
    await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

    // Assert
    expect(engine.status(2).currentHp).toBe(0);
    expect(engine.status(1).specialAttackRank).toBe(1);
  });

  it('前のターンにひんしになっていた相手は、次のターンにもう一度知らせない', async () => {
    // Arrange: 相手はターンの初めからひんしで、控えと交代する
    const engine = setup({}, { currentHp: 0 });

    // Act
    await engine.runTurn({ moveId: SPLASH.id }, { switchPokemonId: 3 });

    // Assert
    expect(engine.status(1).specialAttackRank).toBe(0);
  });
});
