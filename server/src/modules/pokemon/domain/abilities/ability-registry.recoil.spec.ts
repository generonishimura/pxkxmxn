import { AbilityRegistry } from './ability-registry';
import { RockHeadEffect } from './effects/other/rock-head-effect';
import { MagicGuardEffect } from './effects/other/magic-guard-effect';

describe('AbilityRegistry（反動を受けない特性）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it.each([
    ['いしあたま', RockHeadEffect],
    ['マジックガード', MagicGuardEffect],
  ])('%s が DB の特性名で登録され、反動を受けない', (name, effectClass) => {
    // Act
    const effect = AbilityRegistry.get(name);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
    expect(effect?.preventsRecoil).toBe(true);
  });
});
