import { RoarEffect } from './roar-effect';

describe('RoarEffect（ほえる）', () => {
  it('相手を控えとランダムに入れ替える（forceSwitch が true）', () => {
    // Arrange
    const effect = new RoarEffect();

    // Act
    const forceSwitch = effect.forceSwitch;

    // Assert
    expect(forceSwitch).toBe(true);
  });
});
