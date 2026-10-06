import { MoveRegistry } from './move-registry';
import { FacadeEffect } from './effects/facade-effect';

describe('MoveRegistry: 威力が変わる技', () => {
  beforeEach(() => {
    MoveRegistry.initialize();
  });

  it.each([['からげんき', FacadeEffect]])(
    '%s に対応する効果クラスが登録されている',
    (moveName, effectClass) => {
      // Act
      const effect = MoveRegistry.get(moveName);

      // Assert
      expect(effect).toBeInstanceOf(effectClass);
    },
  );
});
