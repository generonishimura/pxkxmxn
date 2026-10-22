import { AbilityRegistry } from './ability-registry';
import { WonderSkinEffect } from './effects/other/wonder-skin-effect';
import { MagicBounceEffect } from './effects/other/magic-bounce-effect';
import { MyceliumMightEffect } from './effects/other/mycelium-might-effect';

describe('AbilityRegistry（変化技に関わる特性）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it.each([
    ['ミラクルスキン', WonderSkinEffect],
    ['マジックミラー', MagicBounceEffect],
    ['きんしのちから', MyceliumMightEffect],
  ])('%s が登録されている', (name, effectClass) => {
    // Act
    const effect = AbilityRegistry.get(name);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
  });
});
