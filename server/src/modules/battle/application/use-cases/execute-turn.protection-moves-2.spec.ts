import { StatusCondition } from '../../domain/entities/status-condition.enum';
import { MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { MoveRegistry } from '@/modules/pokemon/domain/moves/move-registry';
import { VolatileState } from '../../domain/state/volatile-state';
import { createBattleEngine, createTestMove } from '../__tests__/battle-engine-harness';

/**
 * トリックガード・ニードルガード・たたみがえし・ふかしのこぶし（登録した本物の効果を使う）
 * ポケモン 1 が攻撃し、ポケモン 2 が守りの技を使う。どちらも最大 HP 160。
 * たいあたり（威力 50・接触・タイプ一致）のダメージは 36
 */
describe('ExecuteTurnUseCase - トリックガード・ニードルガード・たたみがえし・ふかしのこぶし', () => {
  const SPLASH = createTestMove(1, 'はねる', { category: MoveCategory.Status });
  const TACKLE = createTestMove(2, 'たいあたり');
  const WATER_GUN = createTestMove(3, 'みずでっぽう', {
    type: 'みず',
    category: MoveCategory.Special,
  });
  const THUNDER_WAVE = createTestMove(4, 'でんじは', {
    type: 'でんき',
    category: MoveCategory.Status,
  });
  const CRAFTY_SHIELD = createTestMove(20, 'トリックガード', {
    type: 'フェアリー',
    category: MoveCategory.Status,
    priority: 3,
  });
  const SPIKY_SHIELD = createTestMove(21, 'ニードルガード', {
    type: 'くさ',
    category: MoveCategory.Status,
    priority: 4,
  });
  const MAT_BLOCK = createTestMove(22, 'たたみがえし', {
    type: 'かくとう',
    category: MoveCategory.Status,
  });

  const setup = (
    options: {
      attackerAbility?: string;
      attackerSpeed?: number;
      guardVolatile?: VolatileState;
      turn?: number;
    } = {},
  ) =>
    createBattleEngine({
      moves: [SPLASH, TACKLE, WATER_GUN, THUNDER_WAVE, CRAFTY_SHIELD, SPIKY_SHIELD, MAT_BLOCK],
      turn: options.turn,
      pokemon: [
        {
          id: 1,
          trainerId: 1,
          active: true,
          baseSpeed: options.attackerSpeed ?? 150,
          ability: options.attackerAbility,
          moveIds: [SPLASH.id, TACKLE.id, WATER_GUN.id, THUNDER_WAVE.id],
        },
        {
          id: 2,
          trainerId: 2,
          active: true,
          volatileState: options.guardVolatile,
          moveIds: [SPLASH.id, CRAFTY_SHIELD.id, SPIKY_SHIELD.id, MAT_BLOCK.id],
        },
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

  describe('トリックガード', () => {
    it('相手の変化技を防ぐ', async () => {
      // Arrange
      const engine = setup();

      // Act
      const result = await engine.runTurn(
        { moveId: THUNDER_WAVE.id },
        { moveId: CRAFTY_SHIELD.id },
      );

      // Assert
      expect(engine.status(2).statusCondition).toBe(StatusCondition.None);
      expect(result.actions.map(action => action.result)).toEqual([
        'Used トリックガード protected its team!',
        'Used でんじは but it was blocked (トリックガード)',
      ]);
    });

    it('相手の攻撃技は防がない', async () => {
      // Arrange
      const engine = setup();

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: CRAFTY_SHIELD.id });

      // Assert
      expect(engine.status(2).currentHp).toBe(124);
    });
  });

  describe('ニードルガード', () => {
    it('相手の技を防ぎ、接触した相手に最大 HP の 1/8 のダメージを与える', async () => {
      // Arrange
      const engine = setup();

      // Act
      const result = await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPIKY_SHIELD.id });

      // Assert
      expect(engine.status(2).currentHp).toBe(160);
      expect(engine.status(1).currentHp).toBe(140);
      expect(result.actions[0].result).toBe('Used ニードルガード protected itself!');
    });

    it('相手の変化技も防ぐ', async () => {
      // Arrange
      const engine = setup();

      // Act
      await engine.runTurn({ moveId: THUNDER_WAVE.id }, { moveId: SPIKY_SHIELD.id });

      // Assert
      expect(engine.status(2).statusCondition).toBe(StatusCondition.None);
    });

    it('接触しない技を防いでも、相手にダメージを与えない', async () => {
      // Arrange
      const engine = setup();

      // Act
      await engine.runTurn({ moveId: WATER_GUN.id }, { moveId: SPIKY_SHIELD.id });

      // Assert
      expect(engine.status(2).currentHp).toBe(160);
      expect(engine.status(1).currentHp).toBe(160);
    });

    it('続けて使うと成功率が 1/3 になる', async () => {
      // Arrange
      jest.spyOn(Math, 'random').mockReturnValue(0.34);
      const engine = setup({ guardVolatile: { protectCount: 1 } });

      // Act
      const result = await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPIKY_SHIELD.id });

      // Assert
      expect(result.actions[0].result).toBe('Used ニードルガード but it failed');
      expect(engine.status(2).currentHp).toBe(124);
    });
  });

  describe('たたみがえし', () => {
    it('出てから最初の行動なら、相手の攻撃技を防ぐ', async () => {
      // Arrange
      // たたみがえしは優先度 0 なので、相手より先に動くよう相手を遅くする
      // 最初から場にいる（switchedInTurn: 0）ポケモンの 1 ターン目は、出てから最初の行動
      const engine = setup({ turn: 1, guardVolatile: { switchedInTurn: 0 }, attackerSpeed: 50 });

      // Act
      const result = await engine.runTurn({ moveId: TACKLE.id }, { moveId: MAT_BLOCK.id });

      // Assert
      expect(engine.status(2).currentHp).toBe(160);
      expect(result.actions.map(action => action.result)).toEqual([
        'Used たたみがえし protected its team!',
        'Used たいあたり but it was blocked (たたみがえし)',
      ]);
    });

    it('相手の変化技は防がない', async () => {
      // Arrange
      const engine = setup({ turn: 1, guardVolatile: { switchedInTurn: 0 }, attackerSpeed: 50 });

      // Act
      await engine.runTurn({ moveId: THUNDER_WAVE.id }, { moveId: MAT_BLOCK.id });

      // Assert
      expect(engine.status(2).statusCondition).toBe(StatusCondition.Paralysis);
    });

    it('出てから最初の行動でなければ失敗する', async () => {
      // Arrange
      const engine = setup({ turn: 2, guardVolatile: { switchedInTurn: 0 }, attackerSpeed: 50 });

      // Act
      const result = await engine.runTurn({ moveId: TACKLE.id }, { moveId: MAT_BLOCK.id });

      // Assert
      expect(result.actions[0].result).toBe('Used たたみがえし but it failed');
      expect(engine.status(2).currentHp).toBe(124);
    });
  });

  describe('ふかしのこぶし', () => {
    it('接触技は相手のニードルガードを通り抜け、接触したときのダメージも受けない', async () => {
      // Arrange
      const engine = setup({ attackerAbility: 'ふかしのこぶし' });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPIKY_SHIELD.id });

      // Assert
      expect(engine.status(2).currentHp).toBe(124);
      expect(engine.status(1).currentHp).toBe(160);
    });

    it('接触技は相手のたたみがえしを通り抜ける', async () => {
      // Arrange
      const engine = setup({
        attackerAbility: 'ふかしのこぶし',
        turn: 1,
        guardVolatile: { switchedInTurn: 0 },
        attackerSpeed: 50,
      });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: MAT_BLOCK.id });

      // Assert
      expect(engine.status(2).currentHp).toBe(124);
    });

    it('接触しない技は相手のニードルガードに防がれる', async () => {
      // Arrange
      const engine = setup({ attackerAbility: 'ふかしのこぶし' });

      // Act
      await engine.runTurn({ moveId: WATER_GUN.id }, { moveId: SPIKY_SHIELD.id });

      // Assert
      expect(engine.status(2).currentHp).toBe(160);
    });

    it('変化技は相手のトリックガードに防がれる', async () => {
      // Arrange
      const engine = setup({ attackerAbility: 'ふかしのこぶし' });

      // Act
      await engine.runTurn({ moveId: THUNDER_WAVE.id }, { moveId: CRAFTY_SHIELD.id });

      // Assert
      expect(engine.status(2).statusCondition).toBe(StatusCondition.None);
    });
  });
});
