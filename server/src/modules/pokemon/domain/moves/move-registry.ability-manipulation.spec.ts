import { MoveRegistry } from './move-registry';
import { SkillSwapEffect } from './effects/skill-swap-effect';
import { RolePlayEffect } from './effects/role-play-effect';
import { DoodleEffect } from './effects/doodle-effect';
import { GastroAcidEffect } from './effects/gastro-acid-effect';

describe('MoveRegistry: 特性を書き換える・消す技', () => {
  beforeEach(() => {
    MoveRegistry.initialize();
  });

  it.each([
    ['スキルスワップ', SkillSwapEffect],
    ['なりきり', RolePlayEffect],
    ['うつしえ', DoodleEffect],
    ['いえき', GastroAcidEffect],
  ])('%s が登録されている', (moveName, effectClass) => {
    // Act
    const effect = MoveRegistry.get(moveName);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
  });
});
