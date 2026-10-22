import { BattleArmorEffect } from './battle-armor-effect';

describe('BattleArmorEffect', () => {
  it('急所に当たらない特性として、preventsCriticalHit を持つ', () => {
    // Arrange
    const effect = new BattleArmorEffect();

    // Act
    const prevents = effect.preventsCriticalHit;

    // Assert
    expect(prevents).toBe(true);
  });

  it('かたやぶりで無視される特性なので、unaffectedByMoldBreaker は持たない', () => {
    // Arrange
    const effect = new BattleArmorEffect();

    // Act
    const hasUnaffected = 'unaffectedByMoldBreaker' in effect;

    // Assert
    expect(hasUnaffected).toBe(false);
  });
});
