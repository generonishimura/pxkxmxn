import { AbilityRegistry } from './ability-registry';
import { CloudNineEffect } from './effects/weather/cloud-nine-effect';

describe('AbilityRegistry（天候の効果をなくす特性）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('ノーてんき が DB の特性名で登録され、天候の効果をなくす', () => {
    // Act
    const effect = AbilityRegistry.get('ノーてんき');

    // Assert
    expect(effect).toBeInstanceOf(CloudNineEffect);
    expect(effect?.suppressesWeather).toBe(true);
  });
});
