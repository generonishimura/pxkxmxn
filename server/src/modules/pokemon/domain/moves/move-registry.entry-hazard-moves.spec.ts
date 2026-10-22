import { MoveRegistry } from './move-registry';
import { SpikesEffect } from './effects/spikes-effect';
import { ToxicSpikesEffect } from './effects/toxic-spikes-effect';
import { StealthRockEffect } from './effects/stealth-rock-effect';
import { StickyWebEffect } from './effects/sticky-web-effect';

describe('MoveRegistry: 設置技', () => {
  beforeEach(() => {
    MoveRegistry.initialize();
  });

  it.each([
    ['まきびし', SpikesEffect],
    ['どくびし', ToxicSpikesEffect],
    ['ステルスロック', StealthRockEffect],
    ['ねばねばネット', StickyWebEffect],
  ])('%s に対応する効果クラスが登録されている', (moveName, effectClass) => {
    // Act
    const effect = MoveRegistry.get(moveName);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
  });
});
