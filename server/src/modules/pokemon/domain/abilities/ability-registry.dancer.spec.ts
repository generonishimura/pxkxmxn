import { AbilityRegistry } from './ability-registry';
import { DancerEffect } from './effects/other/dancer-effect';

describe('AbilityRegistry（おどりこ）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('おどりこ が登録されている', () => {
    // Act
    const effect = AbilityRegistry.get('おどりこ');

    // Assert
    expect(effect).toBeInstanceOf(DancerEffect);
  });
});
