import { AbilityRegistry } from './ability-registry';
import { DisguiseEffect } from './effects/other/disguise-effect';
import { IceFaceEffect } from './effects/other/ice-face-effect';
import { PowerConstructEffect } from './effects/other/power-construct-effect';
import { BattleBondEffect } from './effects/stat-change/battle-bond-effect';
import { GulpMissileEffect } from './effects/other/gulp-missile-effect';

describe('AbilityRegistry（フォルムチェンジの特性）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it.each([
    ['ばけのかわ', DisguiseEffect],
    ['アイスフェイス', IceFaceEffect],
    ['スワームチェンジ', PowerConstructEffect],
    ['きずなへんげ', BattleBondEffect],
    ['うのミサイル', GulpMissileEffect],
  ])('%s が登録されている', (name, effectClass) => {
    // Act
    const effect = AbilityRegistry.get(name);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
  });
});
