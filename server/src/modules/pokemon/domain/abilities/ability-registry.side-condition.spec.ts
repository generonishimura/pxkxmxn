import { AbilityRegistry } from './ability-registry';
import { InfiltratorEffect } from './effects/other/infiltrator-effect';
import { ScreenCleanerEffect } from './effects/other/screen-cleaner-effect';

describe('AbilityRegistry（陣営の守りに関わる特性）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it.each([
    ['すりぬけ', InfiltratorEffect],
    ['バリアフリー', ScreenCleanerEffect],
  ])('%s が DB の特性名で登録されている', (name, effectClass) => {
    // Act
    const effect = AbilityRegistry.get(name);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
  });
});
