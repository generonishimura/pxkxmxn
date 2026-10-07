import { Field, Weather } from '../../domain/entities/battle.entity';
import { getGlobalFieldState } from '../../domain/state/side-state';
import { MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { MoveRegistry } from '@/modules/pokemon/domain/moves/move-registry';
import { createBattleEngine, createTestMove } from '../__tests__/battle-engine-harness';

/**
 * 天候・フィールドの残りターン数と、ターン終了時の効果（エンジン全体）
 * どちらのポケモンも最大 HP 160。はねるは何もしない変化技
 */
describe('ExecuteTurnUseCase - 天候とフィールドのターン', () => {
  const SPLASH = createTestMove(1, 'はねる', { category: MoveCategory.Status });
  const RAIN_DANCE = createTestMove(2, 'あまごい', { type: 'みず', category: MoveCategory.Status });
  const moves = [SPLASH, RAIN_DANCE];

  const setup = (
    options: {
      weather?: Weather;
      field?: Field;
      weatherTurns?: number;
      terrainTurns?: number;
      currentHp?: number;
      types2?: string[];
    } = {},
  ) =>
    createBattleEngine({
      moves,
      weather: options.weather,
      field: options.field,
      sideState: {
        global: { weatherTurns: options.weatherTurns, terrainTurns: options.terrainTurns },
      },
      pokemon: [
        { id: 1, trainerId: 1, active: true, moveIds: [1, 2], currentHp: options.currentHp },
        {
          id: 2,
          trainerId: 2,
          active: true,
          moveIds: [1],
          currentHp: options.currentHp,
          types: options.types2,
        },
      ],
    });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    MoveRegistry.clear();
    MoveRegistry.initialize();
  });

  it('あまごいは 5 ターンの雨を出し、そのターンの終わりに残りが 4 になる', async () => {
    // Arrange
    const engine = setup();

    // Act
    await engine.runTurn({ moveId: RAIN_DANCE.id }, { moveId: SPLASH.id });

    // Assert
    expect(engine.battle().weather).toBe(Weather.Rain);
    expect(getGlobalFieldState(engine.battle().sideState).weatherTurns).toBe(4);
  });

  it('すなあらしの残りが 1 のターンの終わりに天候が終わり、そのターンはダメージを受けない', async () => {
    // Arrange
    const engine = setup({ weather: Weather.Sandstorm, weatherTurns: 1 });

    // Act
    await engine.runTurn({ moveId: SPLASH.id }, { moveId: SPLASH.id });

    // Assert
    expect(engine.battle().weather).toBe(Weather.None);
    expect(getGlobalFieldState(engine.battle().sideState).weatherTurns).toBeUndefined();
    expect(engine.status(1).currentHp).toBe(160);
  });

  it('すなあらしの残りが 2 以上なら、ターンの終わりに最大 HP の 1/16 のダメージを受ける', async () => {
    // Arrange
    const engine = setup({ weather: Weather.Sandstorm, weatherTurns: 3 });

    // Act
    await engine.runTurn({ moveId: SPLASH.id }, { moveId: SPLASH.id });

    // Assert
    expect(engine.status(1).currentHp).toBe(150);
    expect(getGlobalFieldState(engine.battle().sideState).weatherTurns).toBe(2);
  });

  it('グラスフィールドの間、地面にいるポケモンはターンの終わりに最大 HP の 1/16 回復する', async () => {
    // Arrange
    const engine = setup({ field: Field.GrassyTerrain, terrainTurns: 3, currentHp: 100 });

    // Act
    await engine.runTurn({ moveId: SPLASH.id }, { moveId: SPLASH.id });

    // Assert
    expect(engine.status(1).currentHp).toBe(110);
    expect(engine.status(2).currentHp).toBe(110);
  });

  it('グラスフィールドでも、ひこうタイプは回復しない', async () => {
    // Arrange
    const engine = setup({
      field: Field.GrassyTerrain,
      terrainTurns: 3,
      currentHp: 100,
      types2: ['ひこう'],
    });

    // Act
    await engine.runTurn({ moveId: SPLASH.id }, { moveId: SPLASH.id });

    // Assert
    expect(engine.status(2).currentHp).toBe(100);
  });

  it('フィールドの残りが 1 のターンは、回復したあとにフィールドが終わる', async () => {
    // Arrange
    const engine = setup({ field: Field.GrassyTerrain, terrainTurns: 1, currentHp: 100 });

    // Act
    await engine.runTurn({ moveId: SPLASH.id }, { moveId: SPLASH.id });

    // Assert
    expect(engine.status(1).currentHp).toBe(110);
    expect(engine.battle().field).toBe(Field.None);
    expect(getGlobalFieldState(engine.battle().sideState).terrainTurns).toBeUndefined();
  });
});
