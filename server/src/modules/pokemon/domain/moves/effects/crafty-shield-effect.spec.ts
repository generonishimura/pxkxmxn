import { CraftyShieldEffect } from './crafty-shield-effect';
import { keepsProtectCount } from '@/modules/battle/domain/logic/protection';

describe('CraftyShieldEffect', () => {
  it('自分の陣営にトリックガードを張る守りの技である', () => {
    // Arrange
    const effect = new CraftyShieldEffect();

    // Act
    const protection = effect.protection;

    // Assert
    expect(protection).toEqual({ side: 'craftyShield' });
  });

  it('使ったあと、まもる系を続けた回数を残さない', () => {
    // Arrange
    const effect = new CraftyShieldEffect();

    // Act
    const keeps = keepsProtectCount(effect);

    // Assert
    expect(keeps).toBe(false);
  });
});
