import { MoveRegistry } from './move-registry';
import { TailwindEffect } from './effects/tailwind-effect';
import { AuroraVeilEffect } from './effects/aurora-veil-effect';
import { LuckyChantEffect } from './effects/lucky-chant-effect';

describe('MoveRegistry（陣営に張る技）', () => {
  beforeEach(() => {
    MoveRegistry.initialize();
  });

  it.each([
    ['おいかぜ', TailwindEffect],
    ['オーロラベール', AuroraVeilEffect],
    ['おまじない', LuckyChantEffect],
  ])('%s が DB の技名で登録されている', (moveName, effectClass) => {
    // Act
    const effect = MoveRegistry.get(moveName);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
  });
});
