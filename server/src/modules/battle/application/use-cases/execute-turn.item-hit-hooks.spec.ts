import { MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { MoveRegistry } from '@/modules/pokemon/domain/moves/move-registry';
import { ItemRegistry } from '@/modules/pokemon/domain/items/item-registry';
import { HitResult } from '@/modules/pokemon/domain/battle-events/hit-result';
import {
  HarnessPokemon,
  createBattleEngine,
  createTestMove,
} from '../__tests__/battle-engine-harness';

/**
 * 技を当てたときに、エンジンが持ち物のフックを呼ぶかを、テスト用の持ち物で確かめる
 * トレーナー 1: 場の 1（速い）。トレーナー 2: 場の 2。最大 HP は 160
 */
describe('ExecuteTurnUseCase - 技を当てたときの持ち物のフック', () => {
  const TACKLE = createTestMove(1, 'たいあたり', { power: 40 });
  const SPLASH = createTestMove(2, 'はねる', { category: MoveCategory.Status });
  const DOUBLE_KICK = createTestMove(3, 'にどげり', { type: 'かくとう', power: 30 });
  const SUBSTITUTE = createTestMove(4, 'みがわり', { category: MoveCategory.Status });
  const moves = [TACKLE, SPLASH, DOUBLE_KICK, SUBSTITUTE];
  const allMoveIds = moves.map(m => m.id);

  const setup = (options: { p1?: Partial<HarnessPokemon>; p2?: Partial<HarnessPokemon> } = {}) =>
    createBattleEngine({
      moves,
      pokemon: [
        { id: 1, trainerId: 1, active: true, baseSpeed: 150, moveIds: allMoveIds, ...options.p1 },
        { id: 2, trainerId: 2, active: true, baseSpeed: 50, moveIds: allMoveIds, ...options.p2 },
      ],
    });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    MoveRegistry.clear();
    MoveRegistry.initialize();
    ItemRegistry.initialize();
  });

  describe('防御側の持ち物の onDamagingHit', () => {
    it('ダメージを受けたヒットのたびに、持ち主・攻撃側・ヒットの情報を渡して呼ぶ', async () => {
      // Arrange
      const calls: Array<{ holderId: number; attackerId: number; hit: HitResult }> = [];
      ItemRegistry.register('テストの被弾', {
        onDamagingHit: (holder, attacker, hit) => {
          calls.push({ holderId: holder.id, attackerId: attacker.id, hit });
          return Promise.resolve('テストの被弾 activated!');
        },
      });
      const engine = setup({ p2: { persistentState: { item: 'テストの被弾' } } });

      // Act
      const result = await engine.runTurn({ moveId: DOUBLE_KICK.id }, { moveId: SPLASH.id });

      // Assert
      expect(calls).toHaveLength(2);
      expect(calls[0]).toMatchObject({ holderId: 2, attackerId: 1 });
      expect(calls[0].hit.damage).toBeGreaterThan(0);
      expect(result.actions[0].result).toContain('テストの被弾 activated!');
    });

    it('攻撃側が持っていても呼ばない', async () => {
      // Arrange
      const onDamagingHit = jest.fn().mockResolvedValue(null);
      ItemRegistry.register('テストの被弾', { onDamagingHit });
      const engine = setup({ p1: { persistentState: { item: 'テストの被弾' } } });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(onDamagingHit).not.toHaveBeenCalled();
    });

    it('みがわりに当たったヒットでは呼ばない', async () => {
      // Arrange
      const onDamagingHit = jest.fn().mockResolvedValue(null);
      ItemRegistry.register('テストの被弾', { onDamagingHit });
      const engine = setup({
        p2: { persistentState: { item: 'テストの被弾' }, volatileState: { substituteHp: 100 } },
      });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(onDamagingHit).not.toHaveBeenCalled();
    });
  });

  describe('攻撃側の持ち物の onSourceDamagingHit', () => {
    it('ダメージを与えたヒットのたびに、持ち主・相手を渡して呼ぶ', async () => {
      // Arrange
      const calls: Array<{ holderId: number; targetId: number }> = [];
      ItemRegistry.register('テストの加害', {
        onSourceDamagingHit: (holder, target) => {
          calls.push({ holderId: holder.id, targetId: target.id });
          return Promise.resolve('テストの加害 activated!');
        },
      });
      const engine = setup({ p1: { persistentState: { item: 'テストの加害' } } });

      // Act
      const result = await engine.runTurn({ moveId: DOUBLE_KICK.id }, { moveId: SPLASH.id });

      // Assert
      expect(calls).toEqual([
        { holderId: 1, targetId: 2 },
        { holderId: 1, targetId: 2 },
      ]);
      expect(result.actions[0].result).toContain('テストの加害 activated!');
    });

    it('防御側が持っていても呼ばない', async () => {
      // Arrange
      const onSourceDamagingHit = jest.fn().mockResolvedValue(null);
      ItemRegistry.register('テストの加害', { onSourceDamagingHit });
      const engine = setup({ p2: { persistentState: { item: 'テストの加害' } } });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(onSourceDamagingHit).not.toHaveBeenCalled();
    });
  });
});
