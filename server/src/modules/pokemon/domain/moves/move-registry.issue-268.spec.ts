import { MoveRegistry } from './move-registry';
import { MoonblastEffect } from './effects/moonblast-effect';
import { FreezingGlareEffect } from './effects/freezing-glare-effect';
import { FieryWrathEffect } from './effects/fiery-wrath-effect';
import { ShelterEffect } from './effects/shelter-effect';
import { BodyPressEffect } from './effects/body-press-effect';
import { DireClawEffect } from './effects/dire-claw-effect';
import { LashOutEffect } from './effects/lash-out-effect';
import { BurningJealousyEffect } from './effects/burning-jealousy-effect';
import { RageFistEffect } from './effects/rage-fist-effect';
import { ShellSideArmEffect } from './effects/shell-side-arm-effect';
import { LightThatBurnsTheSkyEffect } from './effects/light-that-burns-the-sky-effect';
import { GrassyGlideEffect } from './effects/grassy-glide-effect';
import { FreezeDryEffect } from './effects/freeze-dry-effect';

describe('MoveRegistry: Issue #268 の技', () => {
  beforeEach(() => {
    MoveRegistry.initialize();
  });

  it.each([
    ['ムーンフォース', MoonblastEffect],
    ['いてつくしせん', FreezingGlareEffect],
    ['もえあがるいかり', FieryWrathEffect],
    ['たてこもる', ShelterEffect],
    ['ボディプレス', BodyPressEffect],
    ['フェイタルクロー', DireClawEffect],
    ['うっぷんばらし', LashOutEffect],
    ['しっとのほのお', BurningJealousyEffect],
    ['ふんどのこぶし', RageFistEffect],
    ['シェルアームズ', ShellSideArmEffect],
    ['てんこがすめつぼうのひかり', LightThatBurnsTheSkyEffect],
    ['グラススライダー', GrassyGlideEffect],
    ['フリーズドライ', FreezeDryEffect],
  ])('%s が登録されている', (moveName, effectClass) => {
    // Act
    const effect = MoveRegistry.get(moveName);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
  });
});
