import { AbilityRegistry } from './ability-registry';
import { GutsAttackBoostEffect } from './effects/damage-modify/guts-attack-boost-effect';

describe('AbilityRegistry（こんじょう・クイックドロウ・テラスシェル）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it.each([['こんじょう', GutsAttackBoostEffect]])('%s が登録されている', (name, effectClass) => {
    // Act
    const effect = AbilityRegistry.get(name);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
  });
});
