import { MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { MoveRegistry } from '@/modules/pokemon/domain/moves/move-registry';
import { createBattleEngine, createTestMove } from '../__tests__/battle-engine-harness';

/**
 * みがわり（エンジン全体）
 * 最大 HP 160 なので、みがわりの HP は 40。威力 50 の物理技は、実数値 120 どうしでタイプ一致（ノーマル）なら 36 ダメージ
 */
describe('ExecuteTurnUseCase - みがわり', () => {
  const SUBSTITUTE = createTestMove(1, 'みがわり', { category: MoveCategory.Status });
  const TACKLE = createTestMove(2, 'たいあたり');
  const MOVES = [SUBSTITUTE, TACKLE];
  const ALL_MOVES = MOVES.map(move => move.id);

  const setup = () =>
    createBattleEngine({
      moves: MOVES,
      pokemon: [
        { id: 1, trainerId: 1, active: true, moveIds: ALL_MOVES },
        { id: 2, trainerId: 2, active: true, moveIds: ALL_MOVES, baseSpeed: 50 },
      ],
    });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    MoveRegistry.clear();
    MoveRegistry.initialize();
  });

  it('みがわりを出したあとの相手の攻撃は、みがわりが受ける', async () => {
    // Arrange
    const engine = setup();

    // Act
    await engine.runTurn({ moveId: SUBSTITUTE.id }, { moveId: TACKLE.id });

    // Assert
    expect(engine.status(1).currentHp).toBe(160 - 40);
    expect(engine.status(1).volatileState.substituteHp).toBe(40 - 36);
  });
});
