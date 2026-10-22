import { MoveRegistry } from './move-registry';
import { WhirlwindEffect } from './effects/whirlwind-effect';
import { RoarEffect } from './effects/roar-effect';
import { BatonPassEffect } from './effects/baton-pass-effect';
import { PartingShotEffect } from './effects/parting-shot-effect';
import { FairyLockEffect } from './effects/fairy-lock-effect';
import { TeleportEffect } from './effects/teleport-effect';
import { UTurnEffect } from './effects/u-turn-effect';
import { VoltSwitchEffect } from './effects/volt-switch-effect';
import { FlipTurnEffect } from './effects/flip-turn-effect';
import { DragonTailEffect } from './effects/dragon-tail-effect';
import { CircleThrowEffect } from './effects/circle-throw-effect';

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
    ['とんぼがえり', UTurnEffect],
    ['ボルトチェンジ', VoltSwitchEffect],
    ['クイックターン', FlipTurnEffect],
    ['ドラゴンテール', DragonTailEffect],
    ['ともえなげ', CircleThrowEffect],
  ])('%s が登録されている', (moveName, effectClass) => {
    // Act
    const effect = MoveRegistry.get(moveName);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
  });
});
