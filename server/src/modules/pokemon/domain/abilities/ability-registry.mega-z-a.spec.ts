import { AbilityRegistry } from './ability-registry';
import { MegaSolEffect } from './effects/weather/mega-sol-effect';

describe('AbilityRegistry（レジェンズ Z-A・チャンピオンズのメガシンカの特性）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it.each([['メガソーラー', MegaSolEffect]] as const)(
    '%s が DB の特性名で登録されている',
    (name, effectClass) => {
      // Act
      const effect = AbilityRegistry.get(name);

      // Assert
      expect(effect).toBeInstanceOf(effectClass);
    },
  );
});
