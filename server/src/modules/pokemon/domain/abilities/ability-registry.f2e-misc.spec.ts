import { AbilityRegistry } from './ability-registry';
import { RivalryEffect } from './effects/damage-modify/rivalry-effect';
import { DownloadEffect } from './effects/stat-change/download-effect';
import { StakeoutEffect } from './effects/damage-modify/stakeout-effect';
import { InnardsOutEffect } from './effects/other/innards-out-effect';

describe('AbilityRegistry（とうそうしん・ダウンロード・はりこみ・とびだすなかみ）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it.each([
    ['とうそうしん', RivalryEffect],
    ['ダウンロード', DownloadEffect],
    ['はりこみ', StakeoutEffect],
    ['とびだすなかみ', InnardsOutEffect],
  ])('%s が DB の特性名で登録されている', (name, effectClass) => {
    // Act
    const effect = AbilityRegistry.get(name);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
  });
});
