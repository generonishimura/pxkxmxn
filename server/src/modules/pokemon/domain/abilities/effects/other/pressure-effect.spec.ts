import { AbilityRegistry } from '../../ability-registry';
import { PressureEffect } from './pressure-effect';

describe('PressureEffect（プレッシャー）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('相手が自分に出した技の PP を 1 余分に減らす', () => {
    // Arrange
    const effect = new PressureEffect();

    // Act
    const extra = effect.modifyOpponentPpDeduction();

    // Assert
    expect(extra).toBe(1);
  });

  it('DB の特性名で登録されている', () => {
    // Act
    const effect = AbilityRegistry.get('プレッシャー');

    // Assert
    expect(effect).toBeInstanceOf(PressureEffect);
  });
});
