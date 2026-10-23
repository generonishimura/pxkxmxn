import { IMoveEffect } from '../move-effect.interface';
import { BodyPressEffect } from './body-press-effect';

describe('BodyPressEffect（ボディプレス）', () => {
  it('攻撃の代わりに、自分の防御（ランク込み）でダメージを計算する', () => {
    // Arrange
    const effect: IMoveEffect = new BodyPressEffect();

    // Act
    const override = effect.attackStatOverride;

    // Assert
    expect(override).toEqual({ source: 'attacker', stat: 'defense' });
  });
});
