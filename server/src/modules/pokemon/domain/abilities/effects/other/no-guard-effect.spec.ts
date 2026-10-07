import { NoGuardEffect } from './no-guard-effect';

describe('NoGuardEffect', () => {
  it('自分の技も相手の技も必ず当たる特性として、ensuresMoveHit を持つ', () => {
    // Arrange
    const effect = new NoGuardEffect();

    // Act
    const ensuresHit = effect.ensuresMoveHit;

    // Assert
    expect(ensuresHit).toBe(true);
  });

  it('命中率そのものは書き換えない（判定は AccuracyCalculator が ensuresMoveHit で行う）', () => {
    // Arrange
    const effect = new NoGuardEffect();

    // Act
    const hasModifyAccuracy = 'modifyAccuracy' in effect;

    // Assert
    expect(hasModifyAccuracy).toBe(false);
  });
});
