import { MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { MoveRegistry } from '@/modules/pokemon/domain/moves/move-registry';
import { ItemRegistry } from '@/modules/pokemon/domain/items/item-registry';
import { VolatileState } from '../../domain/state/volatile-state';
import { createBattleEngine, createTestMove } from '../__tests__/battle-engine-harness';

/**
 * きれいなぬけがら: 逃げられない状態・ねをはる・相手の特性があっても交代できる（エンジン全体）
 * トレーナー 1 は場のポケモン 1 から控えのポケモン 3 に交代しようとする
 */
describe('ExecuteTurnUseCase - きれいなぬけがら', () => {
  const SPLASH = createTestMove(1, 'はねる', { category: MoveCategory.Status });

  const setup = (options: {
    item?: string;
    volatileState?: VolatileState;
    opponentAbility?: string;
  }) =>
    createBattleEngine({
      moves: [SPLASH],
      pokemon: [
        {
          id: 1,
          trainerId: 1,
          active: true,
          moveIds: [1],
          volatileState: options.volatileState,
          persistentState: options.item ? { item: options.item } : {},
        },
        { id: 3, trainerId: 1, moveIds: [1] },
        { id: 2, trainerId: 2, active: true, moveIds: [1], ability: options.opponentAbility },
      ],
    });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    MoveRegistry.clear();
    MoveRegistry.initialize();
    ItemRegistry.initialize();
  });

  it.each([
    ['逃げられない状態', { volatileState: { trappedByStatusId: 2 } }],
    ['ねをはる', { volatileState: { ingrain: true } }],
    ['相手のかげふみ', { opponentAbility: 'かげふみ' }],
  ])('持っていると、%sでも交代できる', async (_name, options) => {
    // Arrange
    const engine = setup({ item: 'きれいなぬけがら', ...options });

    // Act
    await engine.runTurn({ switchPokemonId: 3 }, { moveId: SPLASH.id });

    // Assert
    expect(engine.active(1)?.id).toBe(3);
  });

  it('持っていなければ、逃げられない状態では交代できない', async () => {
    // Arrange
    const engine = setup({ volatileState: { trappedByStatusId: 2 } });

    // Act
    await engine.runTurn({ switchPokemonId: 3 }, { moveId: SPLASH.id }).catch(() => undefined);

    // Assert
    expect(engine.active(1)?.id).toBe(1);
  });
});
