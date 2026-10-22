import { MoveRegistry } from './move-registry';
import { CamouflageEffect } from './effects/camouflage-effect';

describe('MoveRegistry（ほごしょく）', () => {
  beforeEach(() => {
    MoveRegistry.initialize();
  });

  it('ほごしょく が登録されている', () => {
    // Act
    const effect = MoveRegistry.get('ほごしょく');

    // Assert
    expect(effect).toBeInstanceOf(CamouflageEffect);
  });
});
