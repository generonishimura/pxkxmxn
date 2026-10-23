import { MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { MoveRegistry } from '@/modules/pokemon/domain/moves/move-registry';
import { ItemRegistry } from '@/modules/pokemon/domain/items/item-registry';
import {
  HarnessPokemon,
  createBattleEngine,
  createTestMove,
} from '../__tests__/battle-engine-harness';

/**
 * 持ち物に関わる特性を、エンジン全体で確かめる
 * ポケモン 1 は素早さ種族値 150（速い）、ポケモン 2 は 50。最大 HP は 160（オボンのみで 40 回復する）
 */
describe('ExecuteTurnUseCase - 持ち物に関わる特性', () => {
  const SPLASH = createTestMove(1, 'はねる', { category: MoveCategory.Status });
  const moves = [SPLASH];
  const allMoveIds = moves.map(move => move.id);

  const setup = (
    options: { p1?: Partial<HarnessPokemon>; p2?: Partial<HarnessPokemon>; turn?: number } = {},
  ) =>
    createBattleEngine({
      moves,
      turn: options.turn,
      pokemon: [
        { id: 1, trainerId: 1, active: true, baseSpeed: 150, moveIds: allMoveIds, ...options.p1 },
        { id: 2, trainerId: 2, active: true, baseSpeed: 50, moveIds: allMoveIds, ...options.p2 },
      ],
    });
  const splash = { moveId: SPLASH.id };

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    MoveRegistry.clear();
    MoveRegistry.initialize();
    ItemRegistry.initialize();
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('きのみを食べるときの特性', () => {
    it('HP が半分以下のオボンのみは、技を出し終えたときに食べる（比べるための基準）', async () => {
      // Arrange
      const engine = setup({ p1: { currentHp: 70, persistentState: { item: 'オボンのみ' } } });

      // Act
      await engine.runTurn(splash, splash);

      // Assert
      expect(engine.status(1).currentHp).toBe(110);
    });

    it('きんちょうかんの相手がいると、オボンのみを食べない', async () => {
      // Arrange
      const engine = setup({
        p1: { currentHp: 70, persistentState: { item: 'オボンのみ' } },
        p2: { ability: 'きんちょうかん' },
      });

      // Act
      await engine.runTurn(splash, splash);

      // Assert
      expect(engine.status(1).currentHp).toBe(70);
      expect(engine.status(1).persistentState.item).toBe('オボンのみ');
    });

    it('じゅくせいなら、オボンのみで最大 HP の 1/2 を回復する', async () => {
      // Arrange
      const engine = setup({
        p1: { ability: 'じゅくせい', currentHp: 70, persistentState: { item: 'オボンのみ' } },
      });

      // Act
      await engine.runTurn(splash, splash);

      // Assert
      expect(engine.status(1).currentHp).toBe(150);
    });

    it('ほおぶくろなら、オボンのみに加えて最大 HP の 1/3 を回復する', async () => {
      // Arrange
      const engine = setup({
        p1: { ability: 'ほおぶくろ', currentHp: 30, persistentState: { item: 'オボンのみ' } },
      });

      // Act
      const result = await engine.runTurn(splash, splash);

      // Assert
      expect(engine.status(1).currentHp).toBe(30 + 40 + 53);
      expect(result.actions[0].result).toContain('ほおぶくろ restored its HP!');
    });

    it('はんすうなら、食べた次のターンのターン終了時に、同じきのみをもう一度食べる', async () => {
      // Arrange
      const engine = setup({
        p1: { ability: 'はんすう', currentHp: 30, persistentState: { item: 'オボンのみ' } },
      });

      // Act
      await engine.runTurn(splash, splash);
      const afterFirstTurn = engine.status(1).currentHp;
      await engine.runTurn(splash, splash);

      // Assert
      expect(afterFirstTurn).toBe(70);
      expect(engine.status(1).currentHp).toBe(110);
      expect(engine.status(1).volatileState.cudChew).toBeUndefined();
    });
  });
});
