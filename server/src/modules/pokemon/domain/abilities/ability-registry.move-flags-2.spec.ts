import { AbilityRegistry } from './ability-registry';
import { PunkRockEffect } from './effects/damage-modify/punk-rock-effect';
import { SharpnessEffect } from './effects/damage-modify/sharpness-effect';

describe('AbilityRegistry（技フラグで判定する特性: 音・切る技）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it.each([
    ['パンクロック', PunkRockEffect],
    ['きれあじ', SharpnessEffect],
  ])('%s が DB の特性名で登録されている', (name, effectClass) => {
    // Act
    const effect = AbilityRegistry.get(name);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
  });
});
