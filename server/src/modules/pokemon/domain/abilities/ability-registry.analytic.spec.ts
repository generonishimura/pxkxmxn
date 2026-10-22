import { AbilityRegistry } from './ability-registry';
import { AnalyticEffect } from './effects/damage-modify/analytic-effect';

describe('AbilityRegistry（アナライズ）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('アナライズ が DB の特性名で登録されている', () => {
    // Act
    const effect = AbilityRegistry.get('アナライズ');

    // Assert
    expect(effect).toBeInstanceOf(AnalyticEffect);
  });
});
