import { SuctionCupsEffect } from './suction-cups-effect';
import { EmergencyExitEffect } from './emergency-exit-effect';

describe('交代についての特性', () => {
  it('きゅうばん は、ほえる・ふきとばしなどで交代させられない', () => {
    // Arrange
    const effect = new SuctionCupsEffect();

    // Act
    const result = effect.preventsForcedSwitch;

    // Assert
    expect(result).toBe(true);
  });

  it('ききかいひ・にげごし は、HP が半分以下になると控えと交代する', () => {
    // Arrange
    const effect = new EmergencyExitEffect();

    // Act
    const result = effect.switchesOutBelowHalfHp;

    // Assert
    expect(result).toBe(true);
  });
});
