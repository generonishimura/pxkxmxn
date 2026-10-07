import { AbilityRegistry } from './ability-registry';
import { ShadowTagEffect } from './effects/other/shadow-tag-effect';
import { MagnetPullEffect } from './effects/other/magnet-pull-effect';
import { ArenaTrapEffect } from './effects/other/arena-trap-effect';

describe('AbilityRegistry（交代・逃げられなくする特性）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it.each([
    ['かげふみ', ShadowTagEffect],
    ['じりょく', MagnetPullEffect],
    ['ありじごく', ArenaTrapEffect],
  ])('%s が登録されている', (name, effectClass) => {
    // Act
    const effect = AbilityRegistry.get(name);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
  });
});
