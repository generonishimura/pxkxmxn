import { MoveRegistry } from './move-registry';
import { LeechSeedEffect } from './effects/leech-seed-effect';
import { NightmareEffect } from './effects/nightmare-effect';
import { CurseEffect } from './effects/curse-effect';

describe('MoveRegistry: 一時的な状態を付与する技', () => {
  beforeEach(() => {
    MoveRegistry.initialize();
  });

  it.each([
    ['やどりぎのタネ', LeechSeedEffect],
    ['あくむ', NightmareEffect],
    ['のろい', CurseEffect],
  ])('%s が登録されている', (moveName, effectClass) => {
    // Act
    const effect = MoveRegistry.get(moveName);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
  });
});
