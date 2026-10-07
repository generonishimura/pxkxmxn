import { AbilityRegistry } from './ability-registry';
import { DisguiseEffect } from './effects/other/disguise-effect';
import { IceFaceEffect } from './effects/other/ice-face-effect';

describe('AbilityRegistry（フォルムチェンジの特性）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it.each([
    ['ばけのかわ', DisguiseEffect],
    ['アイスフェイス', IceFaceEffect],
  ])('%s が登録されている', (name, effectClass) => {
    // Act
    const effect = AbilityRegistry.get(name);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
  });
});
