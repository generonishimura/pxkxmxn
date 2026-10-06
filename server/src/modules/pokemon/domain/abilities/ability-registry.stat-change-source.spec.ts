import { AbilityRegistry } from './ability-registry';
import { SimpleEffect } from './effects/stat-change/simple-effect';
import { ContraryEffect } from './effects/stat-change/contrary-effect';
import { MirrorArmorEffect } from './effects/stat-change/mirror-armor-effect';
import { GuardDogEffect } from './effects/stat-change/guard-dog-effect';
import { OpportunistEffect } from './effects/stat-change/opportunist-effect';

describe('AbilityRegistry（能力ランクの変化を変える・写す特性）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it.each([
    ['たんじゅん', SimpleEffect],
    ['あまのじゃく', ContraryEffect],
    ['ミラーアーマー', MirrorArmorEffect],
    ['ばんけん', GuardDogEffect],
    ['びんじょう', OpportunistEffect],
  ])('%s が登録されている', (name, effectClass) => {
    expect(AbilityRegistry.get(name)).toBeInstanceOf(effectClass);
  });
});
