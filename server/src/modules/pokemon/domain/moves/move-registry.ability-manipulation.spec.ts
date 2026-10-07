import { MoveRegistry } from './move-registry';
import { SkillSwapEffect } from './effects/skill-swap-effect';

describe('MoveRegistry: 特性を書き換える・消す技', () => {
  beforeEach(() => {
    MoveRegistry.initialize();
  });

  it.each([['スキルスワップ', SkillSwapEffect]])('%s が登録されている', (moveName, effectClass) => {
    // Act
    const effect = MoveRegistry.get(moveName);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
  });
});
