import { MoveRegistry } from './move-registry';
import { FoulPlayEffect } from './effects/foul-play-effect';
import { ChipAwayEffect } from './effects/chip-away-effect';

describe('MoveRegistry: 能力の参照先を変える技・相手のランクを無視する技', () => {
  beforeEach(() => {
    MoveRegistry.initialize();
  });

  it('イカサマ に FoulPlayEffect が登録されている', () => {
    // Act
    const effect = MoveRegistry.get('イカサマ');

    // Assert
    expect(effect).toBeInstanceOf(FoulPlayEffect);
  });

  it.each(['なしくずし', 'せいなるつるぎ', 'ＤＤラリアット'])(
    '%s に共有の ChipAwayEffect インスタンスが登録されている',
    moveName => {
      // Act
      const effect = MoveRegistry.get(moveName);

      // Assert
      expect(effect).toBeInstanceOf(ChipAwayEffect);
      expect(effect).toBe(MoveRegistry.get('なしくずし'));
    },
  );
});
