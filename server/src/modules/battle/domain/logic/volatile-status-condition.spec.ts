import { StatusCondition } from '../entities/status-condition.enum';
import {
  LEGACY_CONFUSION_TURNS,
  isLegacyVolatileStatusCondition,
  isVolatileStatusCondition,
  normalizeLegacyStatusCondition,
  rollConfusionTurns,
  volatileStatusConditionPatch,
} from './volatile-status-condition';

describe('volatile-status-condition', () => {
  describe('isVolatileStatusCondition', () => {
    it.each([
      [StatusCondition.Confusion, true],
      [StatusCondition.Flinch, true],
      [StatusCondition.Burn, false],
      [StatusCondition.Sleep, false],
    ])('%s は %s', (status, expected) => {
      // Act
      const result = isVolatileStatusCondition(status);

      // Assert
      expect(result).toBe(expected);
    });
  });

  describe('rollConfusionTurns', () => {
    it.each([
      [0, 2],
      [0.25, 3],
      [0.5, 4],
      [0.999, 5],
    ])('乱数 %s なら %s 回', (random, expected) => {
      // Act
      const result = rollConfusionTurns(random);

      // Assert
      expect(result).toBe(expected);
    });
  });

  describe('volatileStatusConditionPatch', () => {
    it('ひるみは flinched を true にする', () => {
      // Act
      const patch = volatileStatusConditionPatch(StatusCondition.Flinch);

      // Assert
      expect(patch).toEqual({ flinched: true });
    });

    it('状態異常を渡すと空の patch を返す', () => {
      // Act
      const patch = volatileStatusConditionPatch(StatusCondition.Burn);

      // Assert
      expect(patch).toEqual({});
    });
  });

  describe('normalizeLegacyStatusCondition', () => {
    it('古い行のこんらんは、状態異常なしと残り回数に読み替える', () => {
      // Act
      const result = normalizeLegacyStatusCondition(StatusCondition.Confusion, {});

      // Assert
      expect(result).toEqual({
        statusCondition: null,
        volatileState: { confusionTurns: LEGACY_CONFUSION_TURNS },
      });
    });

    it('古い行のこんらんでも、すでに残り回数があればそのまま使う', () => {
      // Act
      const result = normalizeLegacyStatusCondition(StatusCondition.Confusion, {
        confusionTurns: 4,
      });

      // Assert
      expect(result.volatileState.confusionTurns).toBe(4);
    });

    it('古い行のひるみは持ち越さない', () => {
      // Act
      const result = normalizeLegacyStatusCondition(StatusCondition.Flinch, {});

      // Assert
      expect(result).toEqual({ statusCondition: null, volatileState: {} });
    });

    it('状態異常はそのまま返す', () => {
      // Arrange
      const volatileState = { tauntTurns: 2 };

      // Act
      const result = normalizeLegacyStatusCondition(StatusCondition.Burn, volatileState);

      // Assert
      expect(result).toEqual({ statusCondition: StatusCondition.Burn, volatileState });
    });
  });

  describe('isLegacyVolatileStatusCondition', () => {
    it.each([
      ['Confusion', true],
      ['Flinch', true],
      ['Burn', false],
      [null, false],
    ])('%s は %s', (value, expected) => {
      // Act
      const result = isLegacyVolatileStatusCondition(value);

      // Assert
      expect(result).toBe(expected);
    });
  });
});
