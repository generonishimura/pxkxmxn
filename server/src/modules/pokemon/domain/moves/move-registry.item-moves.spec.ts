import { MoveRegistry } from './move-registry';
import { TrickEffect } from './effects/trick-effect';
import { BestowEffect } from './effects/bestow-effect';
import { EmbargoEffect } from './effects/embargo-effect';

describe('MoveRegistry: 持ち物を入れ替える・渡す・使えなくする技', () => {
  beforeEach(() => {
    MoveRegistry.initialize();
  });

  it.each([
    ['トリック', TrickEffect],
    ['すりかえ', TrickEffect],
    ['ギフトパス', BestowEffect],
    ['さしおさえ', EmbargoEffect],
  ])('%s が登録されている', (moveName, effectClass) => {
    // Act
    const effect = MoveRegistry.get(moveName);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
  });
});
