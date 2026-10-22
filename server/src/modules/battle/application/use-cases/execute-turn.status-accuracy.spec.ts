import { StatusCondition } from '../../domain/entities/status-condition.enum';
import { MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { MoveRegistry } from '@/modules/pokemon/domain/moves/move-registry';
import { VolatileState } from '../../domain/state/volatile-state';
import { createBattleEngine, createTestMove } from '../__tests__/battle-engine-harness';

/**
 * 変化技の命中判定（エンジン全体）
 * ポケモン 1 が先に動く。でんじはは命中 90、どくどくは命中 90
 */
describe('ExecuteTurnUseCase - 変化技の命中', () => {
  const SPLASH = createTestMove(1, 'はねる', { category: MoveCategory.Status });
  const THUNDER_WAVE = createTestMove(2, 'でんじは', {
    type: 'でんき',
    category: MoveCategory.Status,
    accuracy: 90,
  });
  const TOXIC = createTestMove(3, 'どくどく', {
    type: 'どく',
    category: MoveCategory.Status,
    accuracy: 90,
  });
  const SWORDS_DANCE = createTestMove(4, 'つるぎのまい', {
    category: MoveCategory.Status,
    accuracy: 50,
  });
  const FLY = createTestMove(5, 'そらをとぶ', { type: 'ひこう', power: 90 });
  const moves = [SPLASH, THUNDER_WAVE, TOXIC, SWORDS_DANCE, FLY];

  const setup = (
    options: {
      attackerTypes?: string[];
      attackerAbility?: string;
      defenderAbility?: string;
      defenderVolatile?: VolatileState;
      defenderEvasionRank?: number;
    } = {},
  ) => {
    const engine = createBattleEngine({
      moves,
      pokemon: [
        {
          id: 1,
          trainerId: 1,
          active: true,
          baseSpeed: 150,
          types: options.attackerTypes,
          ability: options.attackerAbility,
          moveIds: [1, 2, 3, 4],
        },
        {
          id: 2,
          trainerId: 2,
          active: true,
          ability: options.defenderAbility,
          volatileState: options.defenderVolatile,
          moveIds: [1, 5],
        },
      ],
    });
    return engine;
  };

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    MoveRegistry.clear();
    MoveRegistry.initialize();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('相手を対象にする変化技も、命中率で外れる', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0.95);
    const engine = setup();

    // Act
    const result = await engine.runTurn({ moveId: THUNDER_WAVE.id }, { moveId: SPLASH.id });

    // Assert
    expect(result.actions[0].result).toBe('Used でんじは but it missed');
    expect(engine.status(2).statusCondition).toBe(StatusCondition.None);
  });

  it('相手を対象にする変化技も、命中率の範囲なら当たる', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0.85);
    const engine = setup();

    // Act
    await engine.runTurn({ moveId: THUNDER_WAVE.id }, { moveId: SPLASH.id });

    // Assert
    expect(engine.status(2).statusCondition).toBe(StatusCondition.Paralysis);
  });

  it('相手の回避ランクが、変化技の命中にも掛かる', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0.85);
    const engine = setup();
    await engine.battleRepository.updateBattlePokemonStatus(2, { evasionRank: 1 });

    // Act
    const result = await engine.runTurn({ moveId: THUNDER_WAVE.id }, { moveId: SPLASH.id });

    // Assert
    // 命中 90 × 3/4 = 67.5 なので、乱数 0.85 では外れる
    expect(result.actions[0].result).toBe('Used でんじは but it missed');
  });

  it('自分を対象にする変化技は、命中判定をしない', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    const engine = setup();

    // Act
    await engine.runTurn({ moveId: SWORDS_DANCE.id }, { moveId: SPLASH.id });

    // Assert
    expect(engine.status(1).attackRank).toBe(2);
  });

  it('どくタイプが使うどくどくは、必ず当たる', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    const engine = setup({ attackerTypes: ['どく'] });

    // Act
    await engine.runTurn({ moveId: TOXIC.id }, { moveId: SPLASH.id });

    // Assert
    expect(engine.status(2).statusCondition).toBe(StatusCondition.BadPoison);
  });

  it('どくタイプでなければ、どくどくも外れる', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    const engine = setup();

    // Act
    await engine.runTurn({ moveId: TOXIC.id }, { moveId: SPLASH.id });

    // Assert
    expect(engine.status(2).statusCondition).toBe(StatusCondition.None);
  });

  it('相手がノーガードなら、変化技は必ず当たる', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    const engine = setup({ defenderAbility: 'ノーガード' });

    // Act
    await engine.runTurn({ moveId: THUNDER_WAVE.id }, { moveId: SPLASH.id });

    // Assert
    expect(engine.status(2).statusCondition).toBe(StatusCondition.Paralysis);
  });

  describe('隠れている相手', () => {
    const flying: VolatileState = { semiInvulnerable: 'air', chargingMoveId: FLY.id };

    it('そらをとぶで隠れている相手には、変化技も当たらない', async () => {
      // Arrange
      jest.spyOn(Math, 'random').mockReturnValue(0);
      const engine = setup({ defenderVolatile: flying });

      // Act
      const result = await engine.runTurn({ moveId: THUNDER_WAVE.id }, { moveId: SPLASH.id });

      // Assert
      expect(result.actions[0].result).toBe('Used でんじは but it missed');
    });

    it('使用者がノーガードなら、隠れている相手にも当たる', async () => {
      // Arrange
      jest.spyOn(Math, 'random').mockReturnValue(0);
      const engine = setup({ attackerAbility: 'ノーガード', defenderVolatile: flying });

      // Act
      await engine.runTurn({ moveId: THUNDER_WAVE.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(2).statusCondition).toBe(StatusCondition.Paralysis);
    });

    it('どくタイプが使うどくどくは、隠れている相手にも当たる', async () => {
      // Arrange
      jest.spyOn(Math, 'random').mockReturnValue(0);
      const engine = setup({ attackerTypes: ['どく'], defenderVolatile: flying });

      // Act
      await engine.runTurn({ moveId: TOXIC.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(2).statusCondition).toBe(StatusCondition.BadPoison);
    });
  });
});
