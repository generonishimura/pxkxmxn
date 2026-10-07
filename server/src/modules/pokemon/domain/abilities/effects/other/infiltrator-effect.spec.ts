import { InfiltratorEffect } from './infiltrator-effect';

describe('InfiltratorEffect（すりぬけ）', () => {
  it('相手の壁・しんぴのまもり・しろいきり・みがわりを無視する印を持つ', () => {
    // Arrange
    const effect = new InfiltratorEffect();

    // Act
    const infiltrates = effect.infiltrates;

    // Assert
    expect(infiltrates).toBe(true);
  });
});
