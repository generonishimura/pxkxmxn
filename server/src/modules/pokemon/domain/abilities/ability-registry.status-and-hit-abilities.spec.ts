import { AbilityRegistry } from './ability-registry';
import { PoisonHealEffect } from './effects/other/poison-heal-effect';
import { MagicGuardEffect } from './effects/other/magic-guard-effect';
import { PoisonTouchEffect } from './effects/other/poison-touch-effect';
import { MoxieEffect } from './effects/stat-change/moxie-effect';

describe('AbilityRegistry（状態異常ダメージ・ヒット後の特性）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it.each([
    ['ポイズンヒール', PoisonHealEffect],
    ['マジックガード', MagicGuardEffect],
    ['どくしゅ', PoisonTouchEffect],
    ['じしんかじょう', MoxieEffect],
  ])('%s が DB の特性名で登録されている', (name, effectClass) => {
    // Act
    const effect = AbilityRegistry.get(name);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
  });
});
