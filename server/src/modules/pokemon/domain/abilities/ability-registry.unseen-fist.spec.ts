import { AbilityRegistry } from './ability-registry';
import { UnseenFistEffect } from './effects/other/unseen-fist-effect';

describe('AbilityRegistry（ふかしのこぶし）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('ふかしのこぶし が DB の特性名で登録されている', () => {
    // Act
    const effect = AbilityRegistry.get('ふかしのこぶし');

    // Assert
    expect(effect).toBeInstanceOf(UnseenFistEffect);
  });
});
