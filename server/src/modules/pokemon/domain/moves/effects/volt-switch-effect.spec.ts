import { IMoveEffect } from '../move-effect.interface';
import { VoltSwitchEffect } from './volt-switch-effect';

describe('VoltSwitchEffect（ボルトチェンジ）', () => {
  it('ダメージを与えたあと使用者が控えと交代する（selfSwitch が true）', () => {
    // Arrange
    const effect: IMoveEffect = new VoltSwitchEffect();

    // Act
    const selfSwitch = effect.selfSwitch;

    // Assert
    expect(selfSwitch).toBe(true);
  });

  it('相手は交代させない（forceSwitch がない）', () => {
    // Arrange
    const effect: IMoveEffect = new VoltSwitchEffect();

    // Act
    const forceSwitch = effect.forceSwitch;

    // Assert
    expect(forceSwitch).toBeUndefined();
  });
});
