import { isMajorStatus } from './major-status';
import { StatusCondition } from '../entities/status-condition.enum';

describe('isMajorStatus', () => {
  it.each([
    StatusCondition.Burn,
    StatusCondition.Freeze,
    StatusCondition.Paralysis,
    StatusCondition.Poison,
    StatusCondition.BadPoison,
    StatusCondition.Sleep,
  ])('%s は状態異常として扱う', status => {
    // Act
    const result = isMajorStatus(status);

    // Assert
    expect(result).toBe(true);
  });

  it.each([StatusCondition.None, StatusCondition.Flinch, StatusCondition.Confusion])(
    '%s は状態異常として扱わない',
    status => {
      // Act
      const result = isMajorStatus(status);

      // Assert
      expect(result).toBe(false);
    },
  );

  it.each([null, undefined])('%s は状態異常として扱わない', status => {
    // Act
    const result = isMajorStatus(status);

    // Assert
    expect(result).toBe(false);
  });
});
