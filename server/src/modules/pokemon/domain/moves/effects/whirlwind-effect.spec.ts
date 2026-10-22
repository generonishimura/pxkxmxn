import { WhirlwindEffect } from './whirlwind-effect';

describe('WhirlwindEffect（ふきとばし）', () => {
  it('相手を控えとランダムに入れ替える（forceSwitch が true）', () => {
    // Arrange
    const effect = new WhirlwindEffect();

    // Act
    const forceSwitch = effect.forceSwitch;

    // Assert
    expect(forceSwitch).toBe(true);
  });
});
