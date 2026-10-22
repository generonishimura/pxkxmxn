import { UproarEffect } from './uproar-effect';
import { MoveRegistry } from '../move-registry';

describe('UproarEffect（さわぐ）', () => {
  it('3 ターン出し続け、その間は場の誰も眠れない', () => {
    // Act
    const lockedIn = new UproarEffect().lockedIn;

    // Assert
    expect(lockedIn).toEqual({ turns: 3, preventsSleep: true });
  });

  it('DB の技名で登録されている', () => {
    // Arrange
    MoveRegistry.initialize();

    // Act
    const effect = MoveRegistry.get('さわぐ');

    // Assert
    expect(effect).toBeInstanceOf(UproarEffect);
  });
});
