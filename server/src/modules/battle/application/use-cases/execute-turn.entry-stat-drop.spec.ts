import { MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { MoveRegistry } from '@/modules/pokemon/domain/moves/move-registry';
import { createBattleEngine, createTestMove } from '../__tests__/battle-engine-harness';

/**
 * 交代で場に出たときに相手のランクを下げる特性（かんろなミツ・いかく）と、
 * 能力の低下を防ぐ相手の特性（クリアボディ・かいりきバサミ）（エンジン全体）
 * トレーナー 1 は場のポケモン 1 から控えのポケモン 3 に交代する
 */
describe('ExecuteTurnUseCase - 交代で出たときの能力ランクの低下と、それを防ぐ特性', () => {
  const SPLASH = createTestMove(1, 'はねる', { category: MoveCategory.Status });

  const setup = (incomingAbility: string, opponentAbility?: string) =>
    createBattleEngine({
      moves: [SPLASH],
      pokemon: [
        { id: 1, trainerId: 1, active: true, moveIds: [1] },
        { id: 3, trainerId: 1, moveIds: [1], ability: incomingAbility },
        { id: 2, trainerId: 2, active: true, moveIds: [1], ability: opponentAbility },
      ],
    });

  const switchIn = async (engine: ReturnType<typeof setup>) =>
    engine.runTurn({ switchPokemonId: 3 }, { moveId: SPLASH.id });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    MoveRegistry.clear();
    MoveRegistry.initialize();
  });

  it('かんろなミツは、交代で出たときに相手の回避ランクを 1 下げる', async () => {
    // Arrange
    const engine = setup('かんろなミツ');

    // Act
    await switchIn(engine);

    // Assert
    expect(engine.status(2).evasionRank).toBe(-1);
  });

  it('かんろなミツは、相手のクリアボディで回避ランクを下げられない', async () => {
    // Arrange
    const engine = setup('かんろなミツ', 'クリアボディ');

    // Act
    await switchIn(engine);

    // Assert
    expect(engine.status(2).evasionRank).toBe(0);
  });

  it('いかくは、相手のかいりきバサミで攻撃ランクを下げられない', async () => {
    // Arrange
    const engine = setup('いかく', 'かいりきバサミ');

    // Act
    await switchIn(engine);

    // Assert
    expect(engine.status(2).attackRank).toBe(0);
  });
});
