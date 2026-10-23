import { MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { MoveRegistry } from '@/modules/pokemon/domain/moves/move-registry';
import { ItemRegistry } from '@/modules/pokemon/domain/items/item-registry';
import { createBattleEngine, createTestMove } from '../__tests__/battle-engine-harness';

/**
 * 急所ランクを上げる持ち物（エンジン全体）
 * どちらも能力 120・ノーマルタイプ。威力 50 のノーマル技（タイプ一致）は、ふつう 36、急所なら 54 のダメージ
 */
describe('ExecuteTurnUseCase - 急所ランクを上げる持ち物', () => {
  const SPLASH = createTestMove(1, 'はねる', { category: MoveCategory.Status });
  const TACKLE = createTestMove(2, 'たいあたり');
  const moves = [SPLASH, TACKLE];

  const setup = (options: { random: () => number; item: string; nationalDex?: number }) =>
    createBattleEngine({
      moves,
      criticalHitRandom: options.random,
      pokemon: [
        {
          id: 1,
          trainerId: 1,
          active: true,
          baseSpeed: 150,
          moveIds: [2],
          nationalDex: options.nationalDex,
          persistentState: { item: options.item },
        },
        { id: 2, trainerId: 2, active: true, moveIds: [1] },
      ],
    });

  const damageTaken = (engine: ReturnType<typeof setup>): number =>
    160 - engine.status(2).currentHp;

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    MoveRegistry.clear();
    MoveRegistry.initialize();
    ItemRegistry.initialize();
  });

  describe('ピントレンズ', () => {
    it('急所ランクを 1 上げる（乱数が 1/8 より小さければ急所）', async () => {
      // Arrange
      const engine = setup({ random: () => 0.12, item: 'ピントレンズ' });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(damageTaken(engine)).toBe(54);
    });

    it('上げるのは 1 だけ（乱数が 1/8 以上なら急所にならない）', async () => {
      // Arrange
      const engine = setup({ random: () => 0.13, item: 'ピントレンズ' });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(damageTaken(engine)).toBe(36);
    });
  });

  describe('ながねぎ', () => {
    it.each([
      ['カモネギ', 83],
      ['ネギガナイト', 865],
    ])(
      '%s（全国図鑑 %i）が持つと、急所ランクを 2 上げる（乱数が 1/2 より小さければ急所）',
      async (_name, nationalDex) => {
        // Arrange
        const engine = setup({ random: () => 0.4, item: 'ながねぎ', nationalDex });

        // Act
        await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

        // Assert
        expect(damageTaken(engine)).toBe(54);
      },
    );

    it('カモネギ・ネギガナイト以外が持っても、何もしない', async () => {
      // Arrange
      const engine = setup({ random: () => 0.4, item: 'ながねぎ', nationalDex: 84 });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(damageTaken(engine)).toBe(36);
    });
  });
});
