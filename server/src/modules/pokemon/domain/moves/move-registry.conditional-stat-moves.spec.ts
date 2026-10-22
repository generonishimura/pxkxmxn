import { MoveRegistry } from './move-registry';
import { NoOpEffect } from './effects/no-op-effect';
import { RototillerEffect } from './effects/rototiller-effect';
import { FlowerShieldEffect } from './effects/flower-shield-effect';
import { MagneticFluxEffect } from './effects/magnetic-flux-effect';
import { GearUpEffect } from './effects/gear-up-effect';

describe('MoveRegistry: タイプ・特性条件つき能力変化技', () => {
  beforeEach(() => {
    MoveRegistry.initialize();
  });

  it.each([
    ['たがやす', RototillerEffect],
    ['フラワーガード', FlowerShieldEffect],
    ['じばそうさ', MagneticFluxEffect],
    ['アシストギア', GearUpEffect],
  ])('%s に対応する効果クラスが登録されている', (moveName, effectClass) => {
    // Act
    const effect = MoveRegistry.get(moveName);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
  });

  it.each(['ハッピータイム'])('%s は共有の NoOpEffect インスタンスに登録されている', moveName => {
    // Act
    const effect = MoveRegistry.get(moveName);

    // Assert
    expect(effect).toBeInstanceOf(NoOpEffect);
    expect(effect).toBe(MoveRegistry.get('はねる'));
  });
});
