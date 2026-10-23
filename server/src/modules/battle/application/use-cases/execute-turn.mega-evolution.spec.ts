import { MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { MoveRegistry } from '@/modules/pokemon/domain/moves/move-registry';
import { ValidationException } from '@/shared/domain/exceptions';
import { getSideConditions } from '../../domain/state/side-state';
import { createBattleEngine, createTestMove } from '../__tests__/battle-engine-harness';

/**
 * メガシンカ（Issue #261。エンジン全体）
 * - スピアー（全国図鑑 15）: 素早さ 75 → メガシンカで 145（スピアナイト）
 * - プテラ（142）: 素早さ 130 → メガシンカで 150（プテラナイト）
 * - ライボルト（310）: メガシンカで特性がいかく（ライボルトナイト）
 */
describe('ExecuteTurnUseCase - メガシンカ', () => {
  const SPLASH = createTestMove(1, 'はねる', { category: MoveCategory.Status });

  const BEEDRILL = { nationalDex: 15, baseSpeed: 75, persistentState: { item: 'スピアナイト' } };
  const AERODACTYL = {
    nationalDex: 142,
    baseSpeed: 130,
    persistentState: { item: 'プテラナイト' },
  };
  const MANECTRIC = {
    nationalDex: 310,
    baseSpeed: 105,
    persistentState: { item: 'ライボルトナイト' },
  };

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    MoveRegistry.clear();
    MoveRegistry.initialize();
  });

  /** 行動の結果から、技を出したトレーナーの順番を取り出す */
  const moveOrder = (actions: ReadonlyArray<{ trainerId: number; action: string }>) =>
    actions.filter(action => action.action === 'move').map(action => action.trainerId);

  describe('メガシンカしたターン', () => {
    it('メガシンカすると、交代しても残るフォルムがメガシンカした姿になり、トレーナーの記録が残る', async () => {
      // Arrange
      const engine = createBattleEngine({
        moves: [SPLASH],
        pokemon: [
          { id: 1, trainerId: 1, active: true, moveIds: [1], ...BEEDRILL },
          { id: 2, trainerId: 2, active: true, moveIds: [1] },
        ],
      });

      // Act
      const result = await engine.runTurn(
        { moveId: SPLASH.id, megaEvolve: true },
        { moveId: SPLASH.id },
      );

      // Assert
      expect(engine.status(1).persistentState.form).toBe('mega');
      expect(getSideConditions(engine.battle().sideState, 1).megaEvolved).toBe(true);
      expect(result.actions[0]).toEqual({
        trainerId: 1,
        action: 'megaEvolution',
        result: expect.stringContaining('Mega Evolved'),
      });
      expect(moveOrder(result.actions)).toEqual([1, 2]);
    });

    it('メガシンカしなければ、もとの素早さで行動順を決める', async () => {
      // Arrange
      const engine = createBattleEngine({
        moves: [SPLASH],
        pokemon: [
          { id: 1, trainerId: 1, active: true, moveIds: [1], ...BEEDRILL },
          { id: 2, trainerId: 2, active: true, moveIds: [1] },
        ],
      });

      // Act
      const result = await engine.runTurn({ moveId: SPLASH.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(1).persistentState.form).toBeUndefined();
      expect(moveOrder(result.actions)).toEqual([2, 1]);
    });

    it('メガシンカした素早さを、そのターンの行動順から使う（第 7 世代以降）', async () => {
      // Arrange: スピアー 75 < 相手 100 < メガスピアー 145
      const engine = createBattleEngine({
        moves: [SPLASH],
        pokemon: [
          { id: 1, trainerId: 1, active: true, moveIds: [1], ...BEEDRILL },
          { id: 2, trainerId: 2, active: true, moveIds: [1] },
        ],
      });

      // Act
      const result = await engine.runTurn(
        { moveId: SPLASH.id, megaEvolve: true },
        { moveId: SPLASH.id },
      );

      // Assert
      expect(moveOrder(result.actions)).toEqual([1, 2]);
    });

    it('メガシンカした姿の特性が、メガシンカしたときに発動する（いかく）', async () => {
      // Arrange
      const engine = createBattleEngine({
        moves: [SPLASH],
        pokemon: [
          { id: 1, trainerId: 1, active: true, moveIds: [1], ...MANECTRIC },
          { id: 2, trainerId: 2, active: true, moveIds: [1] },
        ],
      });

      // Act
      await engine.runTurn({ moveId: SPLASH.id, megaEvolve: true }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(2).attackRank).toBe(-1);
    });

    it('両方のトレーナーがメガシンカすると、メガシンカする前の素早さが速い方から先にメガシンカする', async () => {
      // Arrange: プテラ 130 > スピアー 75。メガシンカしたあとは メガプテラ 150 > メガスピアー 145
      const engine = createBattleEngine({
        moves: [SPLASH],
        pokemon: [
          { id: 1, trainerId: 1, active: true, moveIds: [1], ...BEEDRILL },
          { id: 2, trainerId: 2, active: true, moveIds: [1], ...AERODACTYL },
        ],
      });

      // Act
      const result = await engine.runTurn(
        { moveId: SPLASH.id, megaEvolve: true },
        { moveId: SPLASH.id, megaEvolve: true },
      );

      // Assert
      const megaOrder = result.actions
        .filter(action => action.action === 'megaEvolution')
        .map(action => action.trainerId);
      expect(megaOrder).toEqual([2, 1]);
      expect(engine.status(1).persistentState.form).toBe('mega');
      expect(engine.status(2).persistentState.form).toBe('mega');
      expect(moveOrder(result.actions)).toEqual([2, 1]);
    });

    it('メガシンカの順番は技の優先度を見ない（遅い方が先制技を選んでも、速い方が先にメガシンカする）', async () => {
      // Arrange
      const QUICK_ATTACK = createTestMove(2, 'でんこうせっか', { priority: 1, power: 1 });
      const engine = createBattleEngine({
        moves: [SPLASH, QUICK_ATTACK],
        pokemon: [
          { id: 1, trainerId: 1, active: true, moveIds: [2], ...BEEDRILL, maxHp: 500 },
          { id: 2, trainerId: 2, active: true, moveIds: [1], ...AERODACTYL, maxHp: 500 },
        ],
      });

      // Act
      const result = await engine.runTurn(
        { moveId: QUICK_ATTACK.id, megaEvolve: true },
        { moveId: SPLASH.id, megaEvolve: true },
      );

      // Assert
      const megaOrder = result.actions
        .filter(action => action.action === 'megaEvolution')
        .map(action => action.trainerId);
      expect(megaOrder).toEqual([2, 1]);
      expect(moveOrder(result.actions)).toEqual([1, 2]);
    });

    it('相手が交代するターンは、交代のあとにメガシンカする（出てきた相手にいかくが効く）', async () => {
      // Arrange
      const engine = createBattleEngine({
        moves: [SPLASH],
        pokemon: [
          { id: 1, trainerId: 1, active: true, moveIds: [1], ...MANECTRIC },
          { id: 2, trainerId: 2, active: true, moveIds: [1] },
          { id: 4, trainerId: 2, moveIds: [1] },
        ],
      });

      // Act
      const result = await engine.runTurn(
        { moveId: SPLASH.id, megaEvolve: true },
        { switchPokemonId: 4 },
      );

      // Assert
      expect(result.actions.map(action => action.action)).toEqual([
        'switch',
        'megaEvolution',
        'move',
      ]);
      expect(engine.status(4).attackRank).toBe(-1);
      expect(engine.status(2).attackRank).toBe(0);
    });
  });

  describe('行動が決まっているターン', () => {
    it('反動で動けないターンは、メガシンカを選んでもメガシンカせず、トレーナーの 1 回も使わない', async () => {
      // Arrange
      const engine = createBattleEngine({
        moves: [SPLASH],
        pokemon: [
          {
            id: 1,
            trainerId: 1,
            active: true,
            moveIds: [1],
            ...BEEDRILL,
            volatileState: { mustRecharge: true },
          },
          { id: 2, trainerId: 2, active: true, moveIds: [1] },
        ],
      });

      // Act
      const result = await engine.runTurn(
        { moveId: SPLASH.id, megaEvolve: true },
        { moveId: SPLASH.id },
      );

      // Assert
      expect(engine.status(1).persistentState.form).toBeUndefined();
      expect(getSideConditions(engine.battle().sideState, 1).megaEvolved).toBeUndefined();
      expect(result.actions.some(action => action.action === 'megaEvolution')).toBe(false);
    });
  });

  describe('メガシンカしたあと', () => {
    it('交代で引っ込んで、また出てきても、メガシンカした姿のまま', async () => {
      // Arrange
      const engine = createBattleEngine({
        moves: [SPLASH],
        pokemon: [
          { id: 1, trainerId: 1, active: true, moveIds: [1], ...BEEDRILL },
          { id: 3, trainerId: 1, moveIds: [1] },
          { id: 2, trainerId: 2, active: true, moveIds: [1] },
        ],
      });
      await engine.runTurn({ moveId: SPLASH.id, megaEvolve: true }, { moveId: SPLASH.id });

      // Act
      await engine.runTurn({ switchPokemonId: 3 }, { moveId: SPLASH.id });
      const result = await engine.runTurn({ switchPokemonId: 1 }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(1).isActive).toBe(true);
      expect(engine.status(1).persistentState.form).toBe('mega');
      expect(result.actions.some(action => action.action === 'megaEvolution')).toBe(false);
    });

    it('メガシンカした素早さは、次のターンからも行動順に使う', async () => {
      // Arrange
      const engine = createBattleEngine({
        moves: [SPLASH],
        pokemon: [
          { id: 1, trainerId: 1, active: true, moveIds: [1], ...BEEDRILL },
          { id: 2, trainerId: 2, active: true, moveIds: [1] },
        ],
      });
      await engine.runTurn({ moveId: SPLASH.id, megaEvolve: true }, { moveId: SPLASH.id });

      // Act
      const result = await engine.runTurn({ moveId: SPLASH.id }, { moveId: SPLASH.id });

      // Assert
      expect(moveOrder(result.actions)).toEqual([1, 2]);
    });
  });

  describe('メガシンカできないリクエスト', () => {
    /** リクエストを弾いたあと、何も書き込まれていないことを確かめるための写し */
    const snapshot = (engine: ReturnType<typeof createBattleEngine>) => ({
      battle: { ...engine.battle() },
      statuses: [1, 2, 3].map(id => {
        const status = engine.status(id);
        return status ? { ...status } : undefined;
      }),
    });

    it('メガストーンを持っていなければ、ValidationException を投げ、何も書き込まない', async () => {
      // Arrange
      const engine = createBattleEngine({
        moves: [SPLASH],
        pokemon: [
          { id: 1, trainerId: 1, active: true, moveIds: [1], nationalDex: 15 },
          { id: 2, trainerId: 2, active: true, moveIds: [1] },
        ],
      });
      const before = snapshot(engine);

      // Act
      const act = engine.runTurn({ moveId: SPLASH.id, megaEvolve: true }, { moveId: SPLASH.id });

      // Assert
      await expect(act).rejects.toThrow(ValidationException);
      expect(snapshot(engine)).toEqual(before);
    });

    it('相手のリクエストが無効なら、メガシンカする側のリクエストも含めて何も書き込まない', async () => {
      // Arrange
      const engine = createBattleEngine({
        moves: [SPLASH],
        pokemon: [
          { id: 1, trainerId: 1, active: true, moveIds: [1], ...BEEDRILL },
          { id: 2, trainerId: 2, active: true, moveIds: [1], nationalDex: 142 },
        ],
      });
      const before = snapshot(engine);

      // Act
      const act = engine.runTurn(
        { moveId: SPLASH.id, megaEvolve: true },
        { moveId: SPLASH.id, megaEvolve: true },
      );

      // Assert
      await expect(act).rejects.toThrow(ValidationException);
      expect(snapshot(engine)).toEqual(before);
    });

    it('このバトルですでにメガシンカしたトレーナーは、別のポケモンでもメガシンカできない', async () => {
      // Arrange: 手持ちの 2 匹がメガストーンを持つ
      const engine = createBattleEngine({
        moves: [SPLASH],
        pokemon: [
          { id: 1, trainerId: 1, active: true, moveIds: [1], ...BEEDRILL },
          { id: 3, trainerId: 1, moveIds: [1], ...AERODACTYL },
          { id: 2, trainerId: 2, active: true, moveIds: [1] },
        ],
      });
      await engine.runTurn({ moveId: SPLASH.id, megaEvolve: true }, { moveId: SPLASH.id });
      await engine.runTurn({ switchPokemonId: 3 }, { moveId: SPLASH.id });
      const before = snapshot(engine);

      // Act
      const act = engine.runTurn({ moveId: SPLASH.id, megaEvolve: true }, { moveId: SPLASH.id });

      // Assert
      await expect(act).rejects.toThrow('already used Mega Evolution');
      expect(engine.status(3).persistentState.form).toBeUndefined();
      expect(snapshot(engine)).toEqual(before);
    });

    it('すでにメガシンカしたポケモンは、もう一度メガシンカできない', async () => {
      // Arrange
      const engine = createBattleEngine({
        moves: [SPLASH],
        pokemon: [
          { id: 1, trainerId: 1, active: true, moveIds: [1], ...BEEDRILL },
          { id: 2, trainerId: 2, active: true, moveIds: [1] },
        ],
      });
      await engine.runTurn({ moveId: SPLASH.id, megaEvolve: true }, { moveId: SPLASH.id });

      // Act
      const act = engine.runTurn({ moveId: SPLASH.id, megaEvolve: true }, { moveId: SPLASH.id });

      // Assert
      await expect(act).rejects.toThrow('already Mega Evolved');
    });

    it('交代と一緒にメガシンカはできない', async () => {
      // Arrange
      const engine = createBattleEngine({
        moves: [SPLASH],
        pokemon: [
          { id: 1, trainerId: 1, active: true, moveIds: [1], ...BEEDRILL },
          { id: 3, trainerId: 1, moveIds: [1] },
          { id: 2, trainerId: 2, active: true, moveIds: [1] },
        ],
      });
      const before = snapshot(engine);

      // Act
      const act = engine.runTurn({ switchPokemonId: 3, megaEvolve: true }, { moveId: SPLASH.id });

      // Assert
      await expect(act).rejects.toThrow(ValidationException);
      expect(snapshot(engine)).toEqual(before);
    });
  });
});
