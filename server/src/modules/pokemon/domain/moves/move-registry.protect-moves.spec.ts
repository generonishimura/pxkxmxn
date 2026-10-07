import { MoveRegistry } from './move-registry';
import { ProtectionMoveConfig } from './move-effect.interface';
import { DetectEffect } from './effects/detect-effect';
import { WideGuardEffect } from './effects/wide-guard-effect';
import { QuickGuardEffect } from './effects/quick-guard-effect';
import { EndureEffect } from './effects/endure-effect';
import { BanefulBunkerEffect } from './effects/baneful-bunker-effect';

describe('MoveRegistry: まもる系の技', () => {
  beforeEach(() => {
    MoveRegistry.clear();
    MoveRegistry.initialize();
  });

  it.each<[string, new () => object, ProtectionMoveConfig]>([
    ['みきり', DetectEffect, { kind: 'protect' }],
    ['ワイドガード', WideGuardEffect, { side: 'wideGuard' }],
    ['ファストガード', QuickGuardEffect, { side: 'quickGuard' }],
    ['こらえる', EndureEffect, { kind: 'endure' }],
    ['トーチカ', BanefulBunkerEffect, { kind: 'banefulBunker' }],
  ])('%s が登録され、守りの種類を持つ', (moveName, effectClass, protection) => {
    // Act
    const effect = MoveRegistry.get(moveName);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
    expect(effect?.protection).toEqual(protection);
  });
});
