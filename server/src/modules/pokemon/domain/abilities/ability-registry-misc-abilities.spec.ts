import { AbilityRegistry } from './ability-registry';
import { TangledFeetEffect } from './effects/stat-change/tangled-feet-effect';
import { StallEffect } from './effects/stat-change/stall-effect';
import { BadDreamsEffect } from './effects/other/bad-dreams-effect';
import { MoodyEffect } from './effects/stat-change/moody-effect';
import { VictoryStarEffect } from './effects/other/victory-star-effect';
import { SweetVeilEffect } from './effects/immunity/sweet-veil-effect';
import { PastelVeilEffect } from './effects/immunity/pastel-veil-effect';

describe('AbilityRegistry（その他の特性）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it.each([
    ['ちどりあし', TangledFeetEffect],
    ['あとだし', StallEffect],
    ['ナイトメア', BadDreamsEffect],
    ['ムラっけ', MoodyEffect],
    ['しょうりのほし', VictoryStarEffect],
    ['スイートベール', SweetVeilEffect],
    ['パステルベール', PastelVeilEffect],
  ])('%s が登録されている', (name, effectClass) => {
    expect(AbilityRegistry.get(name)).toBeInstanceOf(effectClass);
  });
});
