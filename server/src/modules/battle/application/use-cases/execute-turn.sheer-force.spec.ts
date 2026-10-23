import { MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { MoveRegistry } from '@/modules/pokemon/domain/moves/move-registry';
import { ItemRegistry } from '@/modules/pokemon/domain/items/item-registry';
import { StatusCondition } from '../../domain/entities/status-condition.enum';
import {
  HarnessPokemon,
  createBattleEngine,
  createTestMove,
} from '../__tests__/battle-engine-harness';

/**
 * ちからずく（追加効果のある技の威力を 1.3 倍にし、追加効果をなくす）を、エンジン全体で確かめる
 * トレーナー 1: 場の 1（速い）、控えの 3。トレーナー 2: 場の 2（遅い）、控えの 4。最大 HP は 160
 */
describe('ExecuteTurnUseCase - ちからずく', () => {
  const TACKLE = createTestMove(1, 'たいあたり', { power: 50 });
  const SPLASH = createTestMove(2, 'はねる', { category: MoveCategory.Status });
  // ほっぺすりすり: 100% でまひにする追加効果がある
  const NUZZLE = createTestMove(3, 'ほっぺすりすり', { type: 'でんき', power: 50 });
  // 追加効果のない、威力 65 のでんき技（ほっぺすりすりの威力 50 × 5325/4096 = 65 と比べる）
  const PLAIN_ELECTRIC_65 = createTestMove(4, 'テストでんき', { type: 'でんき', power: 65 });
  // げんしのちから: 10% で自分の能力を上げる追加効果がある
  const ANCIENT_POWER = createTestMove(5, 'げんしのちから', {
    type: 'いわ',
    category: MoveCategory.Special,
    power: 60,
  });
  const moves = [TACKLE, SPLASH, NUZZLE, PLAIN_ELECTRIC_65, ANCIENT_POWER];
  const allMoveIds = moves.map(m => m.id);
  const SHEER_FORCE = { ability: 'ちからずく' };

  const setup = (
    options: {
      p1?: Partial<HarnessPokemon>;
      p2?: Partial<HarnessPokemon>;
    } = {},
  ) =>
    createBattleEngine({
      moves,
      pokemon: [
        { id: 1, trainerId: 1, active: true, baseSpeed: 150, moveIds: allMoveIds, ...options.p1 },
        { id: 2, trainerId: 2, active: true, baseSpeed: 50, moveIds: allMoveIds, ...options.p2 },
        { id: 3, trainerId: 1, moveIds: allMoveIds },
        { id: 4, trainerId: 2, moveIds: allMoveIds },
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

  describe('威力', () => {
    it('追加効果のある技の威力を 1.3 倍（5325/4096）にする（威力 50 → 65）', async () => {
      // Arrange
      const sheerForce = setup({ p1: SHEER_FORCE });
      const plain = setup();
      const reference = setup();

      // Act
      await sheerForce.runTurn({ moveId: NUZZLE.id }, { moveId: SPLASH.id });
      await plain.runTurn({ moveId: NUZZLE.id }, { moveId: SPLASH.id });
      await reference.runTurn({ moveId: PLAIN_ELECTRIC_65.id }, { moveId: SPLASH.id });

      // Assert
      expect(damageTaken(sheerForce)).toBeGreaterThan(damageTaken(plain));
      expect(damageTaken(sheerForce)).toBe(damageTaken(reference));
    });

    it('追加効果のない技の威力は変えない', async () => {
      // Arrange
      const sheerForce = setup({ p1: SHEER_FORCE });
      const plain = setup();

      // Act
      await sheerForce.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });
      await plain.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(damageTaken(sheerForce)).toBe(damageTaken(plain));
    });
  });

  describe('追加効果', () => {
    it('相手への追加効果（ほっぺすりすりのまひ）を出さない', async () => {
      // Arrange
      const engine = setup({ p1: SHEER_FORCE });

      // Act
      await engine.runTurn({ moveId: NUZZLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(2).statusCondition).not.toBe(StatusCondition.Paralysis);
    });

    it('ちからずくでなければ、ほっぺすりすりでまひになる', async () => {
      // Arrange
      const engine = setup();

      // Act
      await engine.runTurn({ moveId: NUZZLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(2).statusCondition).toBe(StatusCondition.Paralysis);
    });

    it('自分への追加効果（げんしのちからの能力上昇）も出さない', async () => {
      // Arrange
      jest.spyOn(Math, 'random').mockReturnValue(0);
      const sheerForce = setup({ p1: SHEER_FORCE });
      const plain = setup();

      // Act
      await sheerForce.runTurn({ moveId: ANCIENT_POWER.id }, { moveId: SPLASH.id });
      await plain.runTurn({ moveId: ANCIENT_POWER.id }, { moveId: SPLASH.id });

      // Assert
      expect(sheerForce.status(1).specialAttackRank).toBe(0);
      expect(plain.status(1).specialAttackRank).toBe(1);
    });
  });

  describe('持ち物', () => {
    it('いのちのたま: 追加効果のある技では HP を失わない', async () => {
      // Arrange
      const engine = setup({ p1: { ...SHEER_FORCE, persistentState: { item: 'いのちのたま' } } });

      // Act
      await engine.runTurn({ moveId: NUZZLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(damageTaken(engine)).toBeGreaterThan(0);
      expect(engine.status(1).currentHp).toBe(160);
    });

    it('いのちのたま: 追加効果のない技では HP を失う', async () => {
      // Arrange
      const engine = setup({ p1: { ...SHEER_FORCE, persistentState: { item: 'いのちのたま' } } });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(1).currentHp).toBe(144);
    });

    it('おうじゃのしるし: 追加効果のある技でもひるませる（本家はちからずくのあとに足す）', async () => {
      // Arrange
      jest.spyOn(Math, 'random').mockReturnValue(0.05);
      const engine = setup({
        p1: { ...SHEER_FORCE, persistentState: { item: 'おうじゃのしるし' } },
      });

      // Act
      const result = await engine.runTurn({ moveId: NUZZLE.id }, { moveId: TACKLE.id });

      // Assert
      expect(result.actions[0].result).toContain('flinched!');
      expect(engine.status(1).currentHp).toBe(160);
    });

    it('かいがらのすず: 追加効果のある技では回復しない', async () => {
      // Arrange
      const engine = setup({
        p1: { ...SHEER_FORCE, currentHp: 100, persistentState: { item: 'かいがらのすず' } },
      });

      // Act
      await engine.runTurn({ moveId: NUZZLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(damageTaken(engine)).toBeGreaterThan(0);
      expect(engine.status(1).currentHp).toBe(100);
    });

    it('だっしゅつボタン: 追加効果のある技を受けても使わない', async () => {
      // Arrange
      const engine = setup({
        p1: SHEER_FORCE,
        p2: { persistentState: { item: 'だっしゅつボタン' } },
      });

      // Act
      await engine.runTurn({ moveId: NUZZLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.active(2)?.id).toBe(2);
      expect(engine.status(2).persistentState.item).toBe('だっしゅつボタン');
    });

    it('だっしゅつボタン: 追加効果のない技を受けると使う', async () => {
      // Arrange
      const engine = setup({
        p1: SHEER_FORCE,
        p2: { persistentState: { item: 'だっしゅつボタン' } },
      });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.active(2)?.id).toBe(4);
    });

    it('レッドカード: 追加効果のある技を受けても使わない', async () => {
      // Arrange
      const engine = setup({
        p1: SHEER_FORCE,
        p2: { persistentState: { item: 'レッドカード' } },
      });

      // Act
      await engine.runTurn({ moveId: NUZZLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.active(1)?.id).toBe(1);
      expect(engine.status(2).persistentState.item).toBe('レッドカード');
    });
  });

  describe('技を受けた側の特性', () => {
    it('ぎゃくじょう: 追加効果のある技で HP が半分以下になっても発動しない', async () => {
      // Arrange
      const engine = setup({ p1: SHEER_FORCE, p2: { ability: 'ぎゃくじょう', currentHp: 90 } });

      // Act
      await engine.runTurn({ moveId: NUZZLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(2).currentHp).toBeLessThanOrEqual(80);
      expect(engine.status(2).specialAttackRank).toBe(0);
    });

    it('へんしょく: 追加効果のある技を受けてもタイプが変わらない', async () => {
      // Arrange
      const engine = setup({ p1: SHEER_FORCE, p2: { ability: 'へんしょく' } });

      // Act
      const result = await engine.runTurn({ moveId: NUZZLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(result.actions[0].result).not.toContain('became the');
    });

    it('ききかいひ: 追加効果のある技で HP が半分以下になっても交代しない', async () => {
      // Arrange
      const engine = setup({ p1: SHEER_FORCE, p2: { ability: 'ききかいひ', currentHp: 90 } });

      // Act
      await engine.runTurn({ moveId: NUZZLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(2).currentHp).toBeLessThanOrEqual(80);
      expect(engine.active(2)?.id).toBe(2);
    });
  });
});
