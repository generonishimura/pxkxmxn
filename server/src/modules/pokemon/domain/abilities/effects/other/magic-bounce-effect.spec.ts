import { MagicBounceEffect } from './magic-bounce-effect';

describe('MagicBounceEffect', () => {
  it('はね返せる技を使用者に返す特性として、bouncesMoves を持つ', () => {
    // Arrange
    const effect = new MagicBounceEffect();

    // Act
    const bounces = effect.bouncesMoves;

    // Assert
    expect(bounces).toBe(true);
  });
});
