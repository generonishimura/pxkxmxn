import { MoveRegistry } from './move-registry';
import { MoonblastEffect } from './effects/moonblast-effect';
import { FreezingGlareEffect } from './effects/freezing-glare-effect';
import { FieryWrathEffect } from './effects/fiery-wrath-effect';
import { ShelterEffect } from './effects/shelter-effect';
import { BodyPressEffect } from './effects/body-press-effect';
import { DireClawEffect } from './effects/dire-claw-effect';

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
  ])('%s が登録されている', (moveName, effectClass) => {
    // Act
    const effect = MoveRegistry.get(moveName);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
  });
});
