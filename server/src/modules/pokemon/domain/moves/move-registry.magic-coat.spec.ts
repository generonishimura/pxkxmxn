import { MoveRegistry } from './move-registry';
import { MagicCoatEffect } from './effects/magic-coat-effect';

describe('MoveRegistry（マジックコート）', () => {
  beforeEach(() => {
    MoveRegistry.clear();
    MoveRegistry.initialize();
  });

  it('マジックコート が登録されている', () => {
    // Act
    const effect = MoveRegistry.get('マジックコート');

    // Assert
    expect(effect).toBeInstanceOf(MagicCoatEffect);
  });
});
