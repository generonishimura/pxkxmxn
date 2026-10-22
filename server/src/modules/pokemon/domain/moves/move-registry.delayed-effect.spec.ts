import { MoveRegistry } from './move-registry';
import { YawnEffect } from './effects/yawn-effect';
import { PerishSongEffect } from './effects/perish-song-effect';
import { WishEffect } from './effects/wish-effect';

describe('MoveRegistry（遅れて効く技）', () => {
  beforeEach(() => {
    MoveRegistry.clear();
    MoveRegistry.initialize();
  });

  it.each([
    ['あくび', YawnEffect],
    ['ほろびのうた', PerishSongEffect],
    ['ねがいごと', WishEffect],
  ])('%s が登録されている', (name, effectClass) => {
    expect(MoveRegistry.get(name)).toBeInstanceOf(effectClass);
  });
});
