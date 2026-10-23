import { AbilityRegistry } from './ability-registry';
import { MegaSolEffect } from './effects/weather/mega-sol-effect';
import { DragonizeEffect } from './effects/other/dragonize-effect';
import { PiercingDrillEffect } from './effects/other/piercing-drill-effect';
import { SpicySprayEffect } from './effects/stat-change/spicy-spray-effect';
import { EelevateEffect } from './effects/immunity/eelevate-effect';
import { FireManeEffect } from './effects/damage-modify/fire-mane-effect';
import { AuraGuardEffect } from './effects/damage-modify/aura-guard-effect';

describe('AbilityRegistry（レジェンズ Z-A・チャンピオンズのメガシンカの特性）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it.each([
    ['メガソーラー', MegaSolEffect],
    ['ドラゴンスキン', DragonizeEffect],
    ['かんつうドリル', PiercingDrillEffect],
    ['とびだすハバネロ', SpicySprayEffect],
    ['Eelevate', EelevateEffect],
    ['Fire Mane', FireManeEffect],
    ['Aura Guard', AuraGuardEffect],
  ] as const)('%s が DB の特性名で登録されている', (name, effectClass) => {
    // Act
    const effect = AbilityRegistry.get(name);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
  });
});
