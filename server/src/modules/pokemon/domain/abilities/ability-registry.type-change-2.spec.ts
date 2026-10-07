import { AbilityRegistry } from './ability-registry';
import { ColorChangeEffect } from './effects/other/color-change-effect';
import { ProteanEffect } from './effects/other/protean-effect';
import { NormalizeEffect } from './effects/other/normalize-effect';
import { RefrigerateEffect } from './effects/other/refrigerate-effect';

describe('AbilityRegistry（タイプを変える特性）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it.each([
    ['へんしょく', ColorChangeEffect],
    ['へんげんじざい', ProteanEffect],
    ['ノーマルスキン', NormalizeEffect],
    ['フリーズスキン', RefrigerateEffect],
  ])('%s が登録されている', (name, effectClass) => {
    // Act
    const effect = AbilityRegistry.get(name);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
  });
});
