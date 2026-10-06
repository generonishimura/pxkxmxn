import { AbilityRegistry } from './ability-registry';
import { SoundproofEffect } from './effects/immunity/soundproof-effect';
import { BulletproofEffect } from './effects/immunity/bulletproof-effect';
import { OvercoatEffect } from './effects/immunity/overcoat-effect';
import { IronFistEffect } from './effects/damage-modify/iron-fist-effect';
import { StrongJawEffect } from './effects/damage-modify/strong-jaw-effect';

describe('AbilityRegistry（技フラグで判定する特性）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it.each([
    ['ぼうおん', SoundproofEffect],
    ['ぼうだん', BulletproofEffect],
    ['ぼうじん', OvercoatEffect],
    ['てつのこぶし', IronFistEffect],
    ['がんじょうあご', StrongJawEffect],
  ])('%s が DB の特性名で登録されている', (name, effectClass) => {
    // Act
    const effect = AbilityRegistry.get(name);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
  });
});
