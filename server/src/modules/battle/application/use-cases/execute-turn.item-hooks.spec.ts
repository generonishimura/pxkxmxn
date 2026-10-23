import { MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { MoveRegistry } from '@/modules/pokemon/domain/moves/move-registry';
import { ItemRegistry } from '@/modules/pokemon/domain/items/item-registry';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { HitResult } from '@/modules/pokemon/domain/battle-events/hit-result';
import { VolatileState } from '../../domain/state/volatile-state';
import { createBattleEngine, createTestMove } from '../__tests__/battle-engine-harness';

/**
 * 持ち物のフックを、技の実行の中で呼ぶ場所（急所ランク・技のあと）
 * どちらも能力 120・ノーマルタイプ。威力 50 のノーマル技（タイプ一致）は、ふつう 36、急所なら 54 のダメージ
 */
describe('ExecuteTurnUseCase - 持ち物のフック', () => {
  const SPLASH = createTestMove(1, 'はねる', { category: MoveCategory.Status });
  const TACKLE = createTestMove(2, 'たいあたり');
  const DOUBLE_HIT = createTestMove(3, 'ダブルアタック');
  const MISS = createTestMove(4, 'あたらないわざ', { accuracy: 1 });
  const GROWL = createTestMove(5, 'なきごえ', { category: MoveCategory.Status });
  const moves = [SPLASH, TACKLE, DOUBLE_HIT, MISS, GROWL];

  const setup = (
    options: {
      random?: () => number;
      attackerItem?: string;
      attackerNationalDex?: number;
      defenderTypes?: readonly string[];
      defenderVolatile?: VolatileState;
    } = {},
  ) =>
    createBattleEngine({
      moves,
      criticalHitRandom: options.random,
      pokemon: [
        {
          id: 1,
          trainerId: 1,
          active: true,
          baseSpeed: 150,
          moveIds: [1, 2, 3, 4, 5],
          nationalDex: options.attackerNationalDex,
          persistentState: options.attackerItem ? { item: options.attackerItem } : {},
        },
        {
          id: 2,
          trainerId: 2,
          active: true,
          moveIds: [1],
          types: options.defenderTypes,
          volatileState: options.defenderVolatile,
        },
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

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('modifyCritRatio', () => {
    it('攻撃側の持ち物が急所ランクを上げる（ランク 1 なら、乱数が 1/8 より小さければ急所）', async () => {
      // Arrange
      ItemRegistry.register('テストの急所アップ', {
        modifyCritRatio: (_holder, stage) => stage + 1,
      });
      const engine = setup({ random: () => 0.12, attackerItem: 'テストの急所アップ' });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(damageTaken(engine)).toBe(54);
    });

    it('持ち物がなければ、急所ランク 0 のまま（乱数 0.12 では急所にならない）', async () => {
      // Arrange
      const engine = setup({ random: () => 0.12 });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(damageTaken(engine)).toBe(36);
    });

    it('持ち物のフックに、技の使用者の全国図鑑の番号（attackerNationalDex）を渡す', async () => {
      // Arrange
      const received: Array<number | undefined> = [];
      ItemRegistry.register('テストの番号を見る', {
        modifyCritRatio: (_holder, _stage, ctx?: BattleContext) => {
          received.push(ctx?.attackerNationalDex);
          return undefined;
        },
      });
      const engine = setup({ attackerItem: 'テストの番号を見る', attackerNationalDex: 83 });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(received).toEqual([83]);
    });
  });

  describe('onAfterMoveSecondarySelf', () => {
    const registerRecorder = (): HitResult[] => {
      const hits: HitResult[] = [];
      ItemRegistry.register('テストの技のあと', {
        onAfterMoveSecondarySelf: (_holder, _target, hit) => {
          hits.push(hit);
          return Promise.resolve(null);
        },
      });
      return hits;
    };

    it('攻撃技を当てたあとに 1 回呼ぶ（damage は与えたダメージ）', async () => {
      // Arrange
      const hits = registerRecorder();
      const engine = setup({ attackerItem: 'テストの技のあと' });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(hits).toHaveLength(1);
      expect(hits[0].damage).toBe(36);
    });

    it('連続技でも、技全体で 1 回だけ呼ぶ（damage はすべてのヒットの合計）', async () => {
      // Arrange
      const hits = registerRecorder();
      const engine = setup({ attackerItem: 'テストの技のあと' });

      // Act
      await engine.runTurn({ moveId: DOUBLE_HIT.id }, { moveId: SPLASH.id });

      // Assert
      expect(hits).toHaveLength(1);
      expect(hits[0].damage).toBe(damageTaken(engine));
    });

    it('みがわりに当たったときも呼ぶ（damage はみがわりに与えたダメージ）', async () => {
      // Arrange
      const hits = registerRecorder();
      const engine = setup({
        attackerItem: 'テストの技のあと',
        defenderVolatile: { substituteHp: 40 },
      });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(hits).toHaveLength(1);
      expect(hits[0].damage).toBe(36);
    });

    it('技が外れたときは呼ばない', async () => {
      // Arrange
      const hits = registerRecorder();
      const engine = setup({ attackerItem: 'テストの技のあと' });
      // 命中の乱数を 50 にする（命中率 1 の技は外れる）
      jest.spyOn(Math, 'random').mockReturnValue(0.5);

      // Act
      await engine.runTurn({ moveId: MISS.id }, { moveId: SPLASH.id });

      // Assert
      expect(hits).toHaveLength(0);
    });

    it('技が相手に効かなかったときは呼ばない', async () => {
      // Arrange
      const hits = registerRecorder();
      const engine = setup({ attackerItem: 'テストの技のあと', defenderTypes: ['ゴースト'] });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(hits).toHaveLength(0);
    });

    it('変化技では呼ばない', async () => {
      // Arrange
      const hits = registerRecorder();
      const engine = setup({ attackerItem: 'テストの技のあと' });

      // Act
      await engine.runTurn({ moveId: GROWL.id }, { moveId: SPLASH.id });

      // Assert
      expect(hits).toHaveLength(0);
    });

    it('攻撃側の特性の onAfterMoveSecondarySelf も呼ぶ（特性 → 持ち物の順）', async () => {
      // Arrange
      const order: string[] = [];
      AbilityRegistry.register('テストの特性', {
        onAfterMoveSecondarySelf: () => {
          order.push('ability');
          return Promise.resolve(null);
        },
      });
      ItemRegistry.register('テストの技のあと', {
        onAfterMoveSecondarySelf: () => {
          order.push('item');
          return Promise.resolve('Item message!');
        },
      });
      const engine = createBattleEngine({
        moves,
        pokemon: [
          {
            id: 1,
            trainerId: 1,
            active: true,
            baseSpeed: 150,
            moveIds: [2],
            ability: 'テストの特性',
            persistentState: { item: 'テストの技のあと' },
          },
          { id: 2, trainerId: 2, active: true, moveIds: [1] },
        ],
      });

      // Act
      const result = await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(order).toEqual(['ability', 'item']);
      expect(result.actions[0].result).toContain('Item message!');
    });
  });
});
