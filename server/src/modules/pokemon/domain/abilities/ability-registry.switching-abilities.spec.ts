import { AbilityRegistry } from './ability-registry';
import { SuctionCupsEffect } from './effects/other/suction-cups-effect';
import { ShadowTagEffect } from './effects/other/shadow-tag-effect';
import { MagnetPullEffect } from './effects/other/magnet-pull-effect';
import { ArenaTrapEffect } from './effects/other/arena-trap-effect';
import { EmergencyExitEffect } from './effects/other/emergency-exit-effect';

describe('AbilityRegistry（交代・逃げられなくする特性）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it.each([
    ['きゅうばん', SuctionCupsEffect],
    ['かげふみ', ShadowTagEffect],
    ['じりょく', MagnetPullEffect],
    ['ありじごく', ArenaTrapEffect],
    ['にげごし', EmergencyExitEffect],
    ['ききかいひ', EmergencyExitEffect],
  ])('%s が登録されている', (name, effectClass) => {
    // Act
    const effect = AbilityRegistry.get(name);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
  });
});
