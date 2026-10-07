import { MoveRegistry } from './move-registry';
import { WhirlwindEffect } from './effects/whirlwind-effect';
import { RoarEffect } from './effects/roar-effect';
import { BatonPassEffect } from './effects/baton-pass-effect';
import { PartingShotEffect } from './effects/parting-shot-effect';
import { FairyLockEffect } from './effects/fairy-lock-effect';
import { TeleportEffect } from './effects/teleport-effect';

describe('MoveRegistry: 交代にかかわる技', () => {
  beforeEach(() => {
    MoveRegistry.initialize();
  });

  it.each([
    ['ふきとばし', WhirlwindEffect],
    ['ほえる', RoarEffect],
    ['バトンタッチ', BatonPassEffect],
    ['すてゼリフ', PartingShotEffect],
    ['フェアリーロック', FairyLockEffect],
    ['テレポート', TeleportEffect],
  ])('%s が登録されている', (moveName, effectClass) => {
    // Act
    const effect = MoveRegistry.get(moveName);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
  });
});
