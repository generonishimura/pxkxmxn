import { EarlyBirdEffect } from './early-bird-effect';
import { AbilityRegistry } from '../../ability-registry';

describe('EarlyBirdEffect（はやおき）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('ねむりのターンが1ターンに2ターン分進む', () => {
    // Act
    const multiplier = new EarlyBirdEffect().sleepTurnMultiplier;

    // Assert
    expect(multiplier).toBe(2);
  });

  it('DB の特性名で登録されている', () => {
    // Act
    const effect = AbilityRegistry.get('はやおき');

    // Assert
    expect(effect).toBeInstanceOf(EarlyBirdEffect);
  });
});
