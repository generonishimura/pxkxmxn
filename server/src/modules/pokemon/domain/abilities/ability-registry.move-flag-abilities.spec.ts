import { AbilityRegistry } from './ability-registry';
import { SoundproofEffect } from './effects/immunity/soundproof-effect';
import { BulletproofEffect } from './effects/immunity/bulletproof-effect';
import { OvercoatEffect } from './effects/immunity/overcoat-effect';

describe('AbilityRegistry（技フラグで判定する特性）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it.each([
    ['ぼうおん', SoundproofEffect],
    ['ぼうだん', BulletproofEffect],
    ['ぼうじん', OvercoatEffect],
  ])('%s が DB の特性名で登録されている', (name, effectClass) => {
    // Act
    const effect = AbilityRegistry.get(name);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
  });
});
