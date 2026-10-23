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
 * ひんしになる攻撃を HP 1 で耐える持ち物（きあいのタスキ・きあいのハチマキ）を、エンジン全体で確かめる
 * トレーナー 1: 場の 1（速い）。トレーナー 2: 場の 2（最大 HP 20）
 */
describe('ExecuteTurnUseCase - ひんしになる攻撃を耐える持ち物', () => {
  const STRONG_TACKLE = createTestMove(1, 'たいあたり', { power: 250 });
  const WEAK_TACKLE = createTestMove(2, 'はたく', { power: 1 });
  const SPLASH = createTestMove(3, 'はねる', { category: MoveCategory.Status });
  const DOUBLE_KICK = createTestMove(4, 'にどげり', { type: 'かくとう', power: 250 });
  const moves = [STRONG_TACKLE, WEAK_TACKLE, SPLASH, DOUBLE_KICK];
  const allMoveIds = moves.map(m => m.id);

  const setup = (p2: Partial<HarnessPokemon>) =>
    createBattleEngine({
      moves,
      pokemon: [
        { id: 1, trainerId: 1, active: true, baseSpeed: 150, moveIds: allMoveIds },
        {
          id: 2,
          trainerId: 2,
          active: true,
          baseSpeed: 50,
          maxHp: 20,
          moveIds: allMoveIds,
          ...p2,
        },
        { id: 3, trainerId: 2, moveIds: allMoveIds },
      ],
    });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    MoveRegistry.clear();
    MoveRegistry.initialize();
    ItemRegistry.initialize();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('きあいのタスキ', () => {
    it('HP が満タンのとき、ひんしになる攻撃を HP 1 で耐え、タスキを使い切る', async () => {
      // Arrange
      const engine = setup({ persistentState: { item: 'きあいのタスキ' } });

      // Act
      const result = await engine.runTurn({ moveId: STRONG_TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(2).currentHp).toBe(1);
      expect(engine.status(2).persistentState.item).toBeUndefined();
      expect(engine.status(2).persistentState.consumedItem).toBe('きあいのタスキ');
      expect(result.actions[0].result).toContain('hung on using its きあいのタスキ!');
    });

    it('HP が満タンでないときは耐えず、タスキは残る', async () => {
      // Arrange
      const engine = setup({ currentHp: 19, persistentState: { item: 'きあいのタスキ' } });

      // Act
      await engine.runTurn({ moveId: STRONG_TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(2).currentHp).toBe(0);
      expect(engine.status(2).persistentState.item).toBe('きあいのタスキ');
    });

    it('ひんしにならない攻撃では使わない', async () => {
      // Arrange
      const engine = setup({ persistentState: { item: 'きあいのタスキ' } });

      // Act
      await engine.runTurn({ moveId: WEAK_TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(2).currentHp).toBeGreaterThan(1);
      expect(engine.status(2).persistentState.item).toBe('きあいのタスキ');
    });

    it('連続技は、1 回目を HP 1 で耐えても、2 回目でひんしになる', async () => {
      // Arrange
      const engine = setup({ persistentState: { item: 'きあいのタスキ' } });

      // Act
      await engine.runTurn({ moveId: DOUBLE_KICK.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(2).currentHp).toBe(0);
      expect(engine.status(2).persistentState.consumedItem).toBe('きあいのタスキ');
    });
  });

  describe('きあいのハチマキ', () => {
    it('10% の判定に当たると、ひんしになる攻撃を HP 1 で耐え、ハチマキは残る', async () => {
      // Arrange
      jest.spyOn(Math, 'random').mockReturnValue(0.05);
      const engine = setup({ currentHp: 10, persistentState: { item: 'きあいのハチマキ' } });

      // Act
      const result = await engine.runTurn({ moveId: STRONG_TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(2).currentHp).toBe(1);
      expect(engine.status(2).persistentState.item).toBe('きあいのハチマキ');
      expect(result.actions[0].result).toContain('hung on using its きあいのハチマキ!');
    });

    it('10% の判定に外れると、ひんしになる', async () => {
      // Arrange
      jest.spyOn(Math, 'random').mockReturnValue(0.1);
      const engine = setup({ persistentState: { item: 'きあいのハチマキ' } });

      // Act
      await engine.runTurn({ moveId: STRONG_TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(2).currentHp).toBe(0);
    });

    it('ひんしにならない攻撃では、判定をしない', async () => {
      // Arrange
      const random = jest.spyOn(Math, 'random').mockReturnValue(0.05);
      const engine = setup({ persistentState: { item: 'きあいのハチマキ' } });

      // Act
      await engine.runTurn({ moveId: WEAK_TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(2).currentHp).toBeGreaterThan(1);
      expect(random).not.toHaveBeenCalled();
    });
  });
});
