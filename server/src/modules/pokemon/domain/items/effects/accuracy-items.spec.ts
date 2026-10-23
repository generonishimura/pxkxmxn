import { AccuracyCalculator } from '@/modules/battle/domain/logic/accuracy-calculator';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { AbilityRegistry } from '../../abilities/ability-registry';
import { ItemRegistry } from '../item-registry';

/**
 * 命中に関わる持ち物（AccuracyCalculator を通して確かめる）
 * 命中の乱数（Math.random × 100）が命中率より小さければ当たる
 */
describe('命中に関わる持ち物', () => {
  const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);

  const createStatus = (id: number, item?: string): BattlePokemonStatus =>
    new BattlePokemonStatus(
      id,
      1,
      id,
      id,
      true,
      100,
      100,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      null,
      {},
      item === undefined ? {} : { item },
    );

  const checkHit = (
    accuracy: number,
    options: { attackerItem?: string; defenderItem?: string; isLastToMove?: boolean },
  ): boolean =>
    AccuracyCalculator.checkHit(
      accuracy,
      createStatus(1, options.attackerItem),
      createStatus(2, options.defenderItem),
      undefined,
      undefined,
      { battle, isLastToMove: options.isLastToMove },
    );

  const mockRandom = (value: number): void => {
    jest.spyOn(Math, 'random').mockReturnValue(value);
  };

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    ItemRegistry.initialize();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('こうかくレンズ', () => {
    it('命中率を 1.1 倍（4505/4096）にする（命中率 50 → 約 55）', () => {
      // Arrange
      mockRandom(0.54);

      // Act
      const hit = checkHit(50, { attackerItem: 'こうかくレンズ' });

      // Assert
      expect(hit).toBe(true);
    });

    it('持っていなければ、命中率 50 の技は乱数 54 で外れる', () => {
      // Arrange
      mockRandom(0.54);

      // Act
      const hit = checkHit(50, {});

      // Assert
      expect(hit).toBe(false);
    });
  });

  describe('フォーカスレンズ', () => {
    it('相手のあとに行動するとき、命中率を 1.2 倍（4915/4096）にする（命中率 50 → 約 60）', () => {
      // Arrange
      mockRandom(0.59);

      // Act
      const hit = checkHit(50, { attackerItem: 'フォーカスレンズ', isLastToMove: true });

      // Assert
      expect(hit).toBe(true);
    });

    it('相手より先に行動するときは、命中率を変えない', () => {
      // Arrange
      mockRandom(0.59);

      // Act
      const hit = checkHit(50, { attackerItem: 'フォーカスレンズ', isLastToMove: false });

      // Assert
      expect(hit).toBe(false);
    });
  });

  describe('ひかりのこな', () => {
    it('持ち主が受ける技の命中率を 0.9 倍（3686/4096）にする（命中率 100 → 約 90）', () => {
      // Arrange
      mockRandom(0.9);

      // Act
      const hit = checkHit(100, { defenderItem: 'ひかりのこな' });

      // Assert
      expect(hit).toBe(false);
    });

    it('持ち主が使う技の命中率は変えない', () => {
      // Arrange
      mockRandom(0.9);

      // Act
      const hit = checkHit(100, { attackerItem: 'ひかりのこな' });

      // Assert
      expect(hit).toBe(true);
    });
  });
});
