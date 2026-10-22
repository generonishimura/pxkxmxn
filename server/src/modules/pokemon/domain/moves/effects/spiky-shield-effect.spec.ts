import { SpikyShieldEffect } from './spiky-shield-effect';
import { keepsProtectCount } from '@/modules/battle/domain/logic/protection';

describe('SpikyShieldEffect', () => {
  it('自分を守るニードルガードの守りの技である', () => {
    // Arrange
    const effect = new SpikyShieldEffect();

    // Act
    const protection = effect.protection;

    // Assert
    expect(protection).toEqual({ kind: 'spikyShield' });
  });

  it('使ったあと、まもる系を続けた回数を残す', () => {
    // Arrange
    const effect = new SpikyShieldEffect();

    // Act
    const keeps = keepsProtectCount(effect);

    // Assert
    expect(keeps).toBe(true);
  });
});
