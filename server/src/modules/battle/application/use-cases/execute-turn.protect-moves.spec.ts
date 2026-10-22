import { StatusCondition } from '../../domain/entities/status-condition.enum';
import { MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { MoveRegistry } from '@/modules/pokemon/domain/moves/move-registry';
import { getSideConditions } from '../../domain/state/side-state';
import { createBattleEngine, createTestMove } from '../__tests__/battle-engine-harness';

/**
 * まもる系の本物の技（みきり・ワイドガード・ファストガード・こらえる・トーチカ）
 * ポケモン 1 が攻撃し、ポケモン 2 が守りの技を使う。どちらも最大 HP 160。
 */
describe('ExecuteTurnUseCase - まもる系の技（みきり・ワイドガード・ファストガード・こらえる・トーチカ）', () => {
  const TACKLE = createTestMove(1, 'たいあたり');
  const WATER_GUN = createTestMove(2, 'みずでっぽう', {
    type: 'みず',
    category: MoveCategory.Special,
  });
  const QUICK_ATTACK = createTestMove(3, 'でんこうせっか', { priority: 1 });
  const EARTHQUAKE = createTestMove(4, 'じしん', { type: 'じめん' });
  const BIG_TACKLE = createTestMove(5, 'すてみタックル', { power: 300 });
  const THUNDER_WAVE = createTestMove(6, 'でんじは', {
    type: 'でんき',
    category: MoveCategory.Status,
  });
  const DETECT = createTestMove(20, 'みきり', { category: MoveCategory.Status, priority: 4 });
  const WIDE_GUARD = createTestMove(21, 'ワイドガード', {
    category: MoveCategory.Status,
    priority: 3,
  });
  const QUICK_GUARD = createTestMove(22, 'ファストガード', {
    category: MoveCategory.Status,
    priority: 3,
  });
  const ENDURE = createTestMove(23, 'こらえる', { category: MoveCategory.Status, priority: 4 });
  const BANEFUL_BUNKER = createTestMove(24, 'トーチカ', {
    type: 'どく',
    category: MoveCategory.Status,
    priority: 4,
  });

  const attackerMoves = [TACKLE, WATER_GUN, QUICK_ATTACK, EARTHQUAKE, BIG_TACKLE, THUNDER_WAVE];
  const guardMoves = [DETECT, WIDE_GUARD, QUICK_GUARD, ENDURE, BANEFUL_BUNKER];

  const setup = () =>
    createBattleEngine({
      moves: [...attackerMoves, ...guardMoves],
      pokemon: [
        {
          id: 1,
          trainerId: 1,
          active: true,
          baseSpeed: 150,
          moveIds: attackerMoves.map(move => move.id),
        },
        { id: 2, trainerId: 2, active: true, moveIds: guardMoves.map(move => move.id) },
      ],
    });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    MoveRegistry.clear();
    MoveRegistry.initialize();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('みきり', () => {
    it('相手の攻撃技を防ぎ、protectCount が 1 になる', async () => {
      // Arrange
      const engine = setup();

      // Act
      const result = await engine.runTurn({ moveId: TACKLE.id }, { moveId: DETECT.id });

      // Assert
      expect(engine.status(2).currentHp).toBe(160);
      expect(engine.status(2).volatileState.protectCount).toBe(1);
      expect(result.actions.map(action => action.result)).toEqual([
        'Used みきり protected itself!',
        'Used たいあたり but it was blocked (まもる)',
      ]);
    });

    it('変化技も防ぐ', async () => {
      // Arrange
      const engine = setup();

      // Act
      await engine.runTurn({ moveId: THUNDER_WAVE.id }, { moveId: DETECT.id });

      // Assert
      expect(engine.status(2).statusCondition).toBe(StatusCondition.None);
    });

    it('続けて使うと 1/3 の確率でしか成功しない', async () => {
      // Arrange
      const engine = setup();
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: DETECT.id });
      jest.spyOn(Math, 'random').mockReturnValue(0.34);

      // Act
      const result = await engine.runTurn({ moveId: TACKLE.id }, { moveId: DETECT.id });

      // Assert
      expect(result.actions[0].result).toBe('Used みきり but it failed');
      expect(engine.status(2).currentHp).toBeLessThan(160);
    });
  });

  describe('ワイドガード', () => {
    it('相手全体の技（じしん）を防ぎ、陣営の守りはターンの終わりに消える', async () => {
      // Arrange
      const engine = setup();

      // Act
      const result = await engine.runTurn({ moveId: EARTHQUAKE.id }, { moveId: WIDE_GUARD.id });

      // Assert
      expect(engine.status(2).currentHp).toBe(160);
      expect(result.actions.map(action => action.result)).toEqual([
        'Used ワイドガード protected its team!',
        'Used じしん but it was blocked (ワイドガード)',
      ]);
      expect(getSideConditions(engine.battle().sideState, 2).wideGuard).toBeUndefined();
    });

    it('相手 1 体を対象にする技（たいあたり）は防がない', async () => {
      // Arrange
      const engine = setup();

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: WIDE_GUARD.id });

      // Assert
      expect(engine.status(2).currentHp).toBeLessThan(160);
    });
  });

  describe('ファストガード', () => {
    it('優先度 1 以上の技（でんこうせっか）を防ぐ', async () => {
      // Arrange
      const engine = setup();

      // Act
      const result = await engine.runTurn({ moveId: QUICK_ATTACK.id }, { moveId: QUICK_GUARD.id });

      // Assert
      expect(engine.status(2).currentHp).toBe(160);
      expect(result.actions[1].result).toBe(
        'Used でんこうせっか but it was blocked (ファストガード)',
      );
    });

    it('優先度 0 の技（みずでっぽう）は防がない', async () => {
      // Arrange
      const engine = setup();

      // Act
      await engine.runTurn({ moveId: WATER_GUN.id }, { moveId: QUICK_GUARD.id });

      // Assert
      expect(engine.status(2).currentHp).toBeLessThan(160);
    });
  });

  describe('こらえる', () => {
    it('ひんしになるダメージを受けても HP が 1 残る', async () => {
      // Arrange
      const engine = setup();

      // Act
      const result = await engine.runTurn({ moveId: BIG_TACKLE.id }, { moveId: ENDURE.id });

      // Assert
      expect(engine.status(2).currentHp).toBe(1);
      expect(result.actions[0].result).toBe('Used こらえる braced itself!');
      expect(result.actions[1].result).toContain('The opponent endured the hit!');
    });

    it('相手の技は防がない', async () => {
      // Arrange
      const engine = setup();

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: ENDURE.id });

      // Assert
      expect(engine.status(2).currentHp).toBeLessThan(160);
      expect(engine.status(2).currentHp).toBeGreaterThan(1);
    });
  });

  describe('トーチカ', () => {
    it('接触技を防ぎ、使用者をどくにする', async () => {
      // Arrange
      const engine = setup();

      // Act
      const result = await engine.runTurn({ moveId: TACKLE.id }, { moveId: BANEFUL_BUNKER.id });

      // Assert
      expect(engine.status(2).currentHp).toBe(160);
      expect(engine.status(1).statusCondition).toBe(StatusCondition.Poison);
      expect(result.actions[1].result).toContain('but it was blocked (トーチカ)');
    });

    it('接触しない技（みずでっぽう）は防ぐが、どくにしない', async () => {
      // Arrange
      const engine = setup();

      // Act
      await engine.runTurn({ moveId: WATER_GUN.id }, { moveId: BANEFUL_BUNKER.id });

      // Assert
      expect(engine.status(2).currentHp).toBe(160);
      expect(engine.status(1).statusCondition).toBe(StatusCondition.None);
    });

    it('変化技も防ぐ', async () => {
      // Arrange
      const engine = setup();

      // Act
      await engine.runTurn({ moveId: THUNDER_WAVE.id }, { moveId: BANEFUL_BUNKER.id });

      // Assert
      expect(engine.status(2).statusCondition).toBe(StatusCondition.None);
    });
  });
});
