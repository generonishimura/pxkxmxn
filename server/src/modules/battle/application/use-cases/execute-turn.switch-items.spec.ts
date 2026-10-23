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
 * 攻撃技を受けたときに交代させる持ち物（だっしゅつボタン・レッドカード）を、エンジン全体で確かめる
 * トレーナー 1: 場の 1（速い）、控えの 3。トレーナー 2: 場の 2（遅い）、控えの 4。最大 HP は 160
 */
describe('ExecuteTurnUseCase - 攻撃技を受けたときに交代させる持ち物', () => {
  const TACKLE = createTestMove(1, 'たいあたり', { power: 40 });
  const SPLASH = createTestMove(2, 'はねる', { category: MoveCategory.Status });
  const U_TURN = createTestMove(3, 'とんぼがえり', { type: 'むし', power: 70 });
  const DRAGON_TAIL = createTestMove(4, 'ドラゴンテール', {
    type: 'ドラゴン',
    power: 60,
    priority: -6,
  });
  const moves = [TACKLE, SPLASH, U_TURN, DRAGON_TAIL];
  const allMoveIds = moves.map(m => m.id);
  const EJECT_BUTTON = { persistentState: { item: 'だっしゅつボタン' } };
  const RED_CARD = { persistentState: { item: 'レッドカード' } };

  const setup = (
    options: {
      p1?: Partial<HarnessPokemon>;
      p2?: Partial<HarnessPokemon>;
      p3?: Partial<HarnessPokemon> | null;
      p4?: Partial<HarnessPokemon> | null;
    } = {},
  ) =>
    createBattleEngine({
      moves,
      pokemon: [
        { id: 1, trainerId: 1, active: true, baseSpeed: 150, moveIds: allMoveIds, ...options.p1 },
        { id: 2, trainerId: 2, active: true, baseSpeed: 50, moveIds: allMoveIds, ...options.p2 },
        ...(options.p3 === null
          ? []
          : [{ id: 3, trainerId: 1, moveIds: allMoveIds, ...options.p3 }]),
        ...(options.p4 === null
          ? []
          : [{ id: 4, trainerId: 2, moveIds: allMoveIds, ...options.p4 }]),
      ],
    });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    MoveRegistry.clear();
    MoveRegistry.initialize();
    ItemRegistry.initialize();
  });

  describe('だっしゅつボタン', () => {
    it('攻撃技を受けると控えと交代し、ボタンを使い切る。出てきたポケモンはそのターン動かない', async () => {
      // Arrange
      const engine = setup({ p2: EJECT_BUTTON });

      // Act
      const result = await engine.runTurn({ moveId: TACKLE.id }, { moveId: TACKLE.id });

      // Assert
      expect(engine.active(2)?.id).toBe(4);
      expect(engine.status(2).persistentState.item).toBeUndefined();
      expect(engine.status(2).persistentState.consumedItem).toBe('だっしゅつボタン');
      expect(engine.status(1).currentHp).toBe(160);
      expect(result.actions[0].result).toContain('だっしゅつボタン');
    });

    it('持ち主がひんしになったときは使わない', async () => {
      // Arrange
      const engine = setup({ p2: { ...EJECT_BUTTON, currentHp: 1 } });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(2).currentHp).toBe(0);
      expect(engine.status(2).persistentState.item).toBe('だっしゅつボタン');
    });

    it('控えがいないときは使わない', async () => {
      // Arrange
      const engine = setup({ p2: EJECT_BUTTON, p4: null });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.active(2)?.id).toBe(2);
      expect(engine.status(2).persistentState.item).toBe('だっしゅつボタン');
    });

    it('とんぼがえりを受けて交代すると、とんぼがえりの使用者は交代しない', async () => {
      // Arrange
      const engine = setup({ p2: EJECT_BUTTON });

      // Act
      await engine.runTurn({ moveId: U_TURN.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.active(2)?.id).toBe(4);
      expect(engine.active(1)?.id).toBe(1);
    });

    it('ドラゴンテールで交代させられるときは使わない', async () => {
      // Arrange
      const engine = setup({ p1: { baseSpeed: 50 }, p2: { ...EJECT_BUTTON, baseSpeed: 150 } });

      // Act
      await engine.runTurn({ moveId: DRAGON_TAIL.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.active(2)?.id).toBe(4);
      expect(engine.status(2).persistentState.item).toBe('だっしゅつボタン');
    });

    it('みがわりに当たったときは使わない', async () => {
      // Arrange
      const engine = setup({ p2: { ...EJECT_BUTTON, volatileState: { substituteHp: 100 } } });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.active(2)?.id).toBe(2);
      expect(engine.status(2).persistentState.item).toBe('だっしゅつボタン');
    });
  });

  describe('レッドカード', () => {
    it('攻撃技を受けると、攻撃側を控えと入れ替え、カードを使い切る', async () => {
      // Arrange
      const engine = setup({ p2: RED_CARD });

      // Act
      const result = await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.active(1)?.id).toBe(3);
      expect(engine.active(2)?.id).toBe(2);
      expect(engine.status(2).persistentState.item).toBeUndefined();
      expect(engine.status(2).persistentState.consumedItem).toBe('レッドカード');
      expect(result.actions[0].result).toContain('レッドカード');
    });

    it('攻撃側に控えがいないときは使わない', async () => {
      // Arrange
      const engine = setup({ p2: RED_CARD, p3: null });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.active(1)?.id).toBe(1);
      expect(engine.status(2).persistentState.item).toBe('レッドカード');
    });

    it('持ち主がひんしになったときは使わない', async () => {
      // Arrange
      const engine = setup({ p2: { ...RED_CARD, currentHp: 1 } });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.active(1)?.id).toBe(1);
      expect(engine.status(2).persistentState.item).toBe('レッドカード');
    });

    it('攻撃側がねをはっていると入れ替えないが、カードは使い切る', async () => {
      // Arrange
      const engine = setup({ p1: { volatileState: { ingrain: true } }, p2: RED_CARD });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.active(1)?.id).toBe(1);
      expect(engine.status(2).persistentState.consumedItem).toBe('レッドカード');
    });

    it('攻撃側がきゅうばんなら入れ替えないが、カードは使い切る', async () => {
      // Arrange
      const engine = setup({ p1: { ability: 'きゅうばん' }, p2: RED_CARD });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.active(1)?.id).toBe(1);
      expect(engine.status(2).persistentState.consumedItem).toBe('レッドカード');
    });

    it('ドラゴンテールで持ち主が交代させられるときは使わない', async () => {
      // Arrange
      const engine = setup({ p1: { baseSpeed: 50 }, p2: { ...RED_CARD, baseSpeed: 150 } });

      // Act
      await engine.runTurn({ moveId: DRAGON_TAIL.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.active(2)?.id).toBe(4);
      expect(engine.active(1)?.id).toBe(1);
      expect(engine.status(2).persistentState.item).toBe('レッドカード');
    });

    it('とんぼがえりの使用者は、選んだ交代ではなく、レッドカードで入れ替えられる', async () => {
      // Arrange
      const engine = setup({ p2: RED_CARD });

      // Act
      await engine.runTurn({ moveId: U_TURN.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.active(1)?.id).toBe(3);
      expect(engine.status(2).persistentState.consumedItem).toBe('レッドカード');
    });
  });
});
