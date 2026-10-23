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
 * 持ち物を入れ替える・渡す・使えなくする技（トリック・すりかえ・ギフトパス・さしおさえ）を、エンジン全体で確かめる
 * ポケモン 1 は素早さ種族値 150（速い）、ポケモン 2 は 50。最大 HP は 160
 * フシギバナ（全国図鑑 3）のメガストーンはフシギバナイト
 */
describe('ExecuteTurnUseCase - 持ち物を入れ替える・渡す・使えなくする技', () => {
  const SPLASH = createTestMove(1, 'はねる', { category: MoveCategory.Status });
  const TRICK = createTestMove(2, 'トリック', {
    type: 'エスパー',
    category: MoveCategory.Status,
    accuracy: 100,
  });
  const SWITCHEROO = createTestMove(3, 'すりかえ', {
    type: 'あく',
    category: MoveCategory.Status,
    accuracy: 100,
  });
  const EMBARGO = createTestMove(4, 'さしおさえ', {
    type: 'あく',
    category: MoveCategory.Status,
    accuracy: 100,
  });
  const BESTOW = createTestMove(5, 'ギフトパス', {
    category: MoveCategory.Status,
    accuracy: null,
  });
  const SUBSTITUTE = createTestMove(6, 'みがわり', { category: MoveCategory.Status });
  const moves = [SPLASH, TRICK, SWITCHEROO, EMBARGO, BESTOW, SUBSTITUTE];
  const allMoveIds = moves.map(move => move.id);
  const VENUSAUR = 3;

  const setup = (options: { p1?: Partial<HarnessPokemon>; p2?: Partial<HarnessPokemon> } = {}) =>
    createBattleEngine({
      moves,
      pokemon: [
        { id: 1, trainerId: 1, active: true, baseSpeed: 150, moveIds: allMoveIds, ...options.p1 },
        { id: 2, trainerId: 2, active: true, baseSpeed: 50, moveIds: allMoveIds, ...options.p2 },
      ],
    });
  const holding = (item: string): Partial<HarnessPokemon> => ({ persistentState: { item } });

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

  describe('トリック・すりかえ', () => {
    it('トリックで、使用者と相手の持ち物を入れ替える', async () => {
      // Arrange
      const engine = setup({ p1: holding('こだわりスカーフ'), p2: holding('たべのこし') });

      // Act
      const result = await engine.runTurn({ moveId: TRICK.id }, { moveId: SPLASH.id });

      // Assert
      expect(result.actions[0].result).toBe(
        'Used トリック switched items with its target! The target obtained こだわりスカーフ. The user obtained たべのこし.',
      );
      expect(engine.status(1).persistentState.item).toBe('たべのこし');
      expect(engine.status(2).persistentState.item).toBe('こだわりスカーフ');
    });

    it('すりかえも、持ち物を入れ替える', async () => {
      // Arrange
      const engine = setup({ p1: holding('たべのこし') });

      // Act
      await engine.runTurn({ moveId: SWITCHEROO.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(1).persistentState.item).toBeUndefined();
      expect(engine.status(2).persistentState.item).toBe('たべのこし');
    });

    it('こだわりスカーフを渡すと、使用者の固定は解け、受け取った相手は次に出した技に固定される', async () => {
      // Arrange
      const engine = setup({ p1: holding('こだわりスカーフ') });

      // Act
      await engine.runTurn({ moveId: TRICK.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(1).volatileState.choiceLockedMoveId).toBeUndefined();
      expect(engine.status(2).volatileState.choiceLockedMoveId).toBe(SPLASH.id);
    });

    it('どちらも持ち物を持っていなければ失敗する', async () => {
      // Arrange
      const engine = setup();

      // Act
      const result = await engine.runTurn({ moveId: TRICK.id }, { moveId: SPLASH.id });

      // Assert
      expect(result.actions[0].result).toBe('Used トリック But it failed');
    });

    it('みがわりの相手には失敗する', async () => {
      // Arrange
      const engine = setup({
        p1: holding('こだわりスカーフ'),
        p2: { ...holding('たべのこし'), volatileState: { substituteHp: 40 } },
      });

      // Act
      await engine.runTurn({ moveId: TRICK.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(1).persistentState.item).toBe('こだわりスカーフ');
      expect(engine.status(2).persistentState.item).toBe('たべのこし');
    });

    it('ねんちゃくの相手には、相手が持ち物を持っていなくても失敗する', async () => {
      // Arrange
      const engine = setup({ p1: holding('こだわりスカーフ'), p2: { ability: 'ねんちゃく' } });

      // Act
      const result = await engine.runTurn({ moveId: TRICK.id }, { moveId: SPLASH.id });

      // Assert
      expect(result.actions[0].result).toBe('Used トリック But it failed (ねんちゃく)');
      expect(engine.status(1).persistentState.item).toBe('こだわりスカーフ');
    });

    it('かたやぶりなら、ねんちゃくの相手とも入れ替える', async () => {
      // Arrange
      const engine = setup({
        p1: { ...holding('こだわりスカーフ'), ability: 'かたやぶり' },
        p2: { ...holding('たべのこし'), ability: 'ねんちゃく' },
      });

      // Act
      await engine.runTurn({ moveId: TRICK.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(1).persistentState.item).toBe('たべのこし');
      expect(engine.status(2).persistentState.item).toBe('こだわりスカーフ');
    });

    it('相手がその種族のメガストーンを持っていれば失敗する', async () => {
      // Arrange
      const engine = setup({
        p1: holding('こだわりスカーフ'),
        p2: { ...holding('フシギバナイト'), nationalDex: VENUSAUR },
      });

      // Act
      const result = await engine.runTurn({ moveId: TRICK.id }, { moveId: SPLASH.id });

      // Assert
      expect(result.actions[0].result).toBe('Used トリック But it failed');
      expect(engine.status(2).persistentState.item).toBe('フシギバナイト');
    });

    it('HP が半分以下の相手にオボンのみを渡すと、相手は技のあとすぐに食べる', async () => {
      // Arrange
      const engine = setup({ p1: holding('オボンのみ'), p2: { currentHp: 60 } });

      // Act
      await engine.runTurn({ moveId: TRICK.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(2).currentHp).toBe(100);
      expect(engine.status(2).persistentState.item).toBeUndefined();
    });
  });

  describe('ギフトパス', () => {
    it('持ち物のない相手に、使用者の持ち物を渡す', async () => {
      // Arrange
      const engine = setup({ p1: holding('たべのこし') });

      // Act
      const result = await engine.runTurn({ moveId: BESTOW.id }, { moveId: SPLASH.id });

      // Assert
      expect(result.actions[0].result).toBe('Used ギフトパス The target received たべのこし!');
      expect(engine.status(1).persistentState.item).toBeUndefined();
      expect(engine.status(2).persistentState.item).toBe('たべのこし');
    });

    it('みがわりを貫通する', async () => {
      // Arrange
      const engine = setup({
        p1: holding('たべのこし'),
        p2: { volatileState: { substituteHp: 40 } },
      });

      // Act
      await engine.runTurn({ moveId: BESTOW.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(2).persistentState.item).toBe('たべのこし');
    });

    it('相手が持ち物を持っていれば失敗する', async () => {
      // Arrange
      const engine = setup({ p1: holding('たべのこし'), p2: holding('オボンのみ') });

      // Act
      const result = await engine.runTurn({ moveId: BESTOW.id }, { moveId: SPLASH.id });

      // Assert
      expect(result.actions[0].result).toBe('Used ギフトパス But it failed');
      expect(engine.status(1).persistentState.item).toBe('たべのこし');
    });

    it('使用者が持ち物を持っていなければ失敗する', async () => {
      // Arrange
      const engine = setup();

      // Act
      const result = await engine.runTurn({ moveId: BESTOW.id }, { moveId: SPLASH.id });

      // Assert
      expect(result.actions[0].result).toBe('Used ギフトパス But it failed');
    });

    it('使用者の種族のメガストーンは渡せない', async () => {
      // Arrange
      const engine = setup({ p1: { ...holding('フシギバナイト'), nationalDex: VENUSAUR } });

      // Act
      await engine.runTurn({ moveId: BESTOW.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(1).persistentState.item).toBe('フシギバナイト');
      expect(engine.status(2).persistentState.item).toBeUndefined();
    });
  });

  describe('さしおさえ', () => {
    it('相手の持ち物の効果をなくす（たべのこしでターン終了時に回復しない）', async () => {
      // Arrange
      const engine = setup({ p2: { ...holding('たべのこし'), currentHp: 100 } });

      // Act
      const result = await engine.runTurn({ moveId: EMBARGO.id }, { moveId: SPLASH.id });

      // Assert
      expect(result.actions[0].result).toBe("Used さしおさえ can't use items anymore!");
      expect(engine.status(2).currentHp).toBe(100);
      expect(engine.status(2).persistentState.item).toBe('たべのこし');
    });

    it('5 ターン続く（使ったターンの終わりに 4 になる）', async () => {
      // Arrange
      const engine = setup();

      // Act
      await engine.runTurn({ moveId: EMBARGO.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(2).volatileState.embargoTurns).toBe(4);
    });

    it('すでにさしおさえされている相手には失敗する', async () => {
      // Arrange
      const engine = setup({ p2: { volatileState: { embargoTurns: 3 } } });

      // Act
      const result = await engine.runTurn({ moveId: EMBARGO.id }, { moveId: SPLASH.id });

      // Assert
      expect(result.actions[0].result).toBe('Used さしおさえ But it failed');
    });

    it('切れると、持ち物の効果が戻る', async () => {
      // Arrange
      const engine = setup({
        p2: { ...holding('たべのこし'), currentHp: 100, volatileState: { embargoTurns: 1 } },
      });

      // Act
      await engine.runTurn({ moveId: SPLASH.id }, { moveId: SPLASH.id });
      await engine.runTurn({ moveId: SPLASH.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(2).volatileState.embargoTurns).toBeUndefined();
      expect(engine.status(2).currentHp).toBe(110);
    });

    it('さしおさえされていても、トリックで持ち物を入れ替えられる', async () => {
      // Arrange
      const engine = setup({
        p1: holding('こだわりスカーフ'),
        p2: { ...holding('たべのこし'), volatileState: { embargoTurns: 3 } },
      });

      // Act
      await engine.runTurn({ moveId: TRICK.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(1).persistentState.item).toBe('たべのこし');
      expect(engine.status(2).persistentState.item).toBe('こだわりスカーフ');
    });
  });
});
