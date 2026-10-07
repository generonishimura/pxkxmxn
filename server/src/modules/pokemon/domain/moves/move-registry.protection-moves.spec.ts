import { MoveRegistry } from './move-registry';
import { ProtectEffect } from './effects/protect-effect';
import { KingsShieldEffect } from './effects/kings-shield-effect';
import { ObstructEffect } from './effects/obstruct-effect';
import { SilkTrapEffect } from './effects/silk-trap-effect';
import { BurningBulwarkEffect } from './effects/burning-bulwark-effect';

describe('MoveRegistry: まもる系の技（Issue #102, #103, #107 一部）', () => {
  beforeEach(() => {
    MoveRegistry.clear();
    MoveRegistry.initialize();
  });

  it.each([
    ['まもる', ProtectEffect, 'protect'],
    ['キングシールド', KingsShieldEffect, 'kingsShield'],
    ['ブロッキング', ObstructEffect, 'obstruct'],
    ['スレッドトラップ', SilkTrapEffect, 'silkTrap'],
    ['かえんのまもり', BurningBulwarkEffect, 'burningBulwark'],
  ] as const)('%s が登録され、守りの種類が %s になる', (moveName, effectClass, kind) => {
    // Act
    const effect = MoveRegistry.get(moveName);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
    expect(effect?.protection).toEqual({ kind });
  });
});
