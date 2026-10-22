import { MoveRegistry } from './move-registry';
import { CraftyShieldEffect } from './effects/crafty-shield-effect';
import { SpikyShieldEffect } from './effects/spiky-shield-effect';
import { MatBlockEffect } from './effects/mat-block-effect';

describe('MoveRegistry（トリックガード・ニードルガード・たたみがえし）', () => {
  beforeEach(() => {
    MoveRegistry.clear();
    MoveRegistry.initialize();
  });

  it.each([
    ['トリックガード', CraftyShieldEffect],
    ['ニードルガード', SpikyShieldEffect],
    ['たたみがえし', MatBlockEffect],
  ])('%s が DB の技名で登録されている', (name, effectClass) => {
    // Act
    const effect = MoveRegistry.get(name);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
  });
});
