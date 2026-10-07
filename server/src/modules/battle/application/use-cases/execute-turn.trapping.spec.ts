import { MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { MoveRegistry } from '@/modules/pokemon/domain/moves/move-registry';
import { TrapTarget } from '@/modules/pokemon/domain/battle-events/switching';
import { createBattleEngine, createTestMove } from '../__tests__/battle-engine-harness';

/**
 * 相手の特性（trapsOpponent）とフェアリーロックで交代できないこと（エンジン全体）
 * トレーナー 1 は場の 1 から控えの 3 に交代しようとする
 */
describe('ExecuteTurnUseCase - 逃げられなくする特性とフェアリーロック', () => {
  const SPLASH = createTestMove(1, 'はねる', { category: MoveCategory.Status });

  const setup = (
    options: {
      types1?: string[];
      currentHp1?: number;
      opponentAbility?: string;
      fairyLockTurns?: number;
    } = {},
  ) =>
    createBattleEngine({
      moves: [SPLASH],
      sideState:
        options.fairyLockTurns !== undefined
          ? { global: { fairyLockTurns: options.fairyLockTurns } }
          : {},
      pokemon: [
        {
          id: 1,
          trainerId: 1,
          active: true,
          moveIds: [1],
          types: options.types1,
          currentHp: options.currentHp1,
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
  });

  it('相手の特性の trapsOpponent が true なら交代できない', async () => {
    // Arrange
    const seen: TrapTarget[] = [];
    AbilityRegistry.register('テストのかげふみ', {
      trapsOpponent: (_holder, target) => {
        seen.push(target);
        return true;
      },
    });
    const engine = setup({ opponentAbility: 'テストのかげふみ' });

    // Act
    const result = await engine.runTurn({ switchPokemonId: 3 }, { moveId: SPLASH.id });

    // Assert
    expect(engine.active(1)?.id).toBe(1);
    expect(result.actions[0].result).toBe('Cannot switch out because it is trapped');
    expect(seen[0]).toMatchObject({ typeNames: ['ノーマル'], grounded: true });
  });

  it('相手の特性で逃げられなくても、ゴーストタイプは交代できる', async () => {
    // Arrange
    AbilityRegistry.register('テストのかげふみ', { trapsOpponent: () => true });
    const engine = setup({ opponentAbility: 'テストのかげふみ', types1: ['ゴースト'] });

    // Act
    await engine.runTurn({ switchPokemonId: 3 }, { moveId: SPLASH.id });

    // Assert
    expect(engine.active(1)?.id).toBe(3);
  });

  it('フェアリーロックの間は交代できない', async () => {
    // Arrange
    const engine = setup({ fairyLockTurns: 2 });

    // Act
    const result = await engine.runTurn({ switchPokemonId: 3 }, { moveId: SPLASH.id });

    // Assert
    expect(engine.active(1)?.id).toBe(1);
    expect(result.actions[0].result).toBe('Cannot switch out because it is trapped');
  });

  describe('ひんしのポケモンの入れ替え', () => {
    it('相手の特性の trapsOpponent が true でも、ひんしのポケモンは控えと入れ替えられる', async () => {
      // Arrange
      AbilityRegistry.register('テストのかげふみ', { trapsOpponent: () => true });
      const engine = setup({ opponentAbility: 'テストのかげふみ', currentHp1: 0 });

      // Act
      await engine.runTurn({ switchPokemonId: 3 }, { moveId: SPLASH.id });

      // Assert
      expect(engine.active(1)?.id).toBe(3);
    });

    it('フェアリーロックの間でも、ひんしのポケモンは控えと入れ替えられる', async () => {
      // Arrange
      const engine = setup({ fairyLockTurns: 1, currentHp1: 0 });

      // Act
      await engine.runTurn({ switchPokemonId: 3 }, { moveId: SPLASH.id });

      // Assert
      expect(engine.active(1)?.id).toBe(3);
    });
  });
});
