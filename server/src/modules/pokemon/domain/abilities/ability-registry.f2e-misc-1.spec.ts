import { AbilityRegistry } from './ability-registry';
import { GutsAttackBoostEffect } from './effects/damage-modify/guts-attack-boost-effect';
import { QuickDrawEffect } from './effects/other/quick-draw-effect';

describe('AbilityRegistry（こんじょう・クイックドロウ・テラスシェル）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it.each([
    ['こんじょう', GutsAttackBoostEffect],
    ['クイックドロウ', QuickDrawEffect],
  ])('%s が登録されている', (name, effectClass) => {
    // Act
    const effect = AbilityRegistry.get(name);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
  });
});
