import { AbilityRegistry } from './ability-registry';
import { PunkRockEffect } from './effects/damage-modify/punk-rock-effect';
import { SharpnessEffect } from './effects/damage-modify/sharpness-effect';
import { WindRiderEffect } from './effects/immunity/wind-rider-effect';

describe('AbilityRegistry（技フラグで判定する特性: 音・風・切る技）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it.each([
    ['パンクロック', PunkRockEffect],
    ['きれあじ', SharpnessEffect],
    ['かぜのり', WindRiderEffect],
  ])('%s が DB の特性名で登録されている', (name, effectClass) => {
    // Act
    const effect = AbilityRegistry.get(name);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
  });
});
