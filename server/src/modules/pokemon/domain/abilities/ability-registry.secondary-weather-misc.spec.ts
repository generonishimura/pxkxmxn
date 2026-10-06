import { AbilityRegistry } from './ability-registry';
import { ShieldDustEffect } from './effects/other/shield-dust-effect';
import { SereneGraceEffect } from './effects/other/serene-grace-effect';

describe('AbilityRegistry（追加効果・天候・連続技・ランク無視の特性）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it.each([
    ['りんぷん', ShieldDustEffect],
    ['てんのめぐみ', SereneGraceEffect],
  ])('%s が登録されている', (name, effectClass) => {
    expect(AbilityRegistry.get(name)).toBeInstanceOf(effectClass);
  });
});
