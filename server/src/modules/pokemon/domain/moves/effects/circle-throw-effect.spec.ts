import { IMoveEffect } from '../move-effect.interface';
import { CircleThrowEffect } from './circle-throw-effect';

describe('CircleThrowEffect（ともえなげ）', () => {
  it('ダメージを与えたあと相手を控えとランダムに入れ替える（forceSwitch が true）', () => {
    // Arrange
    const effect: IMoveEffect = new CircleThrowEffect();

    // Act
    const forceSwitch = effect.forceSwitch;

    // Assert
    expect(forceSwitch).toBe(true);
  });

  it('使用者は交代しない（selfSwitch がない）', () => {
    // Arrange
    const effect: IMoveEffect = new CircleThrowEffect();

    // Act
    const selfSwitch = effect.selfSwitch;

    // Assert
    expect(selfSwitch).toBeUndefined();
  });
});
