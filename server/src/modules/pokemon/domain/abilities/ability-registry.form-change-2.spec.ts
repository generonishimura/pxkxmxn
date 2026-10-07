import { AbilityRegistry } from './ability-registry';
import { HungerSwitchEffect } from './effects/other/hunger-switch-effect';
import { ZeroToHeroEffect } from './effects/other/zero-to-hero-effect';
import { TeraShiftEffect } from './effects/other/tera-shift-effect';

describe('AbilityRegistry（はらぺこスイッチ・マイティチェンジ・テラスチェンジ）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it.each([
    ['はらぺこスイッチ', HungerSwitchEffect],
    ['マイティチェンジ', ZeroToHeroEffect],
    ['テラスチェンジ', TeraShiftEffect],
  ])('%s が登録されている', (name, effectClass) => {
    // Act
    const effect = AbilityRegistry.get(name);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
  });
});
