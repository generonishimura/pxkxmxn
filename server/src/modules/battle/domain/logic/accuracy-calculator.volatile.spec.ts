import { AccuracyCalculator } from './accuracy-calculator';
import { BattlePokemonStatus } from '../entities/battle-pokemon-status.entity';
import { VolatileState } from '../state/volatile-state';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { Battle, BattleStatus } from '../entities/battle.entity';

describe('AccuracyCalculator - 一時的な状態（volatileState）', () => {
  const createStatus = (evasionRank: number, volatileState: VolatileState = {}) =>
    new BattlePokemonStatus(
      1,
      1,
      1,
      1,
      true,
      100,
      100,
      0,
      0,
      0,
      0,
      0,
      0,
      evasionRank,
      null,
      volatileState,
    );

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('じゅうりょくの間は、命中率が 6840/4096 倍になる', () => {
    // Arrange: 命中率 58 は 1.67 倍で 96.8 になり、乱数 0.95（95）で当たる
    jest.spyOn(Math, 'random').mockReturnValue(0.95);
    const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null, {
      global: { gravityTurns: 3 },
    });

    // Act
    const hit = AccuracyCalculator.checkHit(
      58,
      createStatus(0),
      createStatus(0),
      undefined,
      undefined,
      {
        battle,
      },
    );

    // Assert
    expect(hit).toBe(true);
  });

  it('じゅうりょくがなければ、命中率 58 は乱数 0.95 で外れる', () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0.95);
    const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);

    // Act
    const hit = AccuracyCalculator.checkHit(
      58,
      createStatus(0),
      createStatus(0),
      undefined,
      undefined,
      {
        battle,
      },
    );

    // Assert
    expect(hit).toBe(false);
  });

  it('使用者がロックオン中なら、命中率にかかわらず当たる', () => {
    // Arrange
    const attacker = createStatus(0, { lockOnTurns: 1 });
    const defender = createStatus(6);

    // Act
    const hit = AccuracyCalculator.checkHit(30, attacker, defender);

    // Assert
    expect(hit).toBe(true);
  });

  it('相手がテレキネシス中なら、命中率にかかわらず当たる', () => {
    // Arrange
    const attacker = createStatus(0);
    const defender = createStatus(0, { telekinesisTurns: 2 });

    // Act
    const hit = AccuracyCalculator.checkHit(30, attacker, defender);

    // Assert
    expect(hit).toBe(true);
  });

  it('みやぶられた相手の、上がった回避ランクは無視する', () => {
    // Arrange
    const attacker = createStatus(0);
    const defender = createStatus(6, { foresight: true });

    // Act
    const hit = AccuracyCalculator.checkHit(100, attacker, defender);

    // Assert
    expect(hit).toBe(true);
  });

  it('みやぶられていない相手の、上がった回避ランクは命中率を下げる', () => {
    // Arrange
    const attacker = createStatus(0);
    const defender = createStatus(6);

    // Act
    const hit = AccuracyCalculator.checkHit(100, attacker, defender);

    // Assert
    expect(hit).toBe(false);
  });

  it('みやぶられた相手でも、下がった回避ランクはそのまま使う', () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0.995);
    const attacker = createStatus(0);
    const defender = createStatus(-1, { foresight: true });

    // Act
    const hit = AccuracyCalculator.checkHit(75, attacker, defender);

    // Assert
    expect(hit).toBe(true);
  });
});
