import { MoveRegistry } from './move-registry';
import { MeFirstEffect } from './effects/me-first-effect';
import { CopycatEffect } from './effects/copycat-effect';
import { InstructEffect } from './effects/instruct-effect';

describe('MoveRegistry: 別の技を出す技', () => {
  beforeEach(() => {
    MoveRegistry.initialize();
  });

  it.each([
    ['さきどり', MeFirstEffect],
    ['まねっこ', CopycatEffect],
    ['さいはい', InstructEffect],
  ])('%s に対応する効果クラスが登録されている', (moveName, effectClass) => {
    // Act
    const effect = MoveRegistry.get(moveName);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
  });
});
