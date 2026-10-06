import { AbilityRegistry } from './ability-registry';
import { MegaLauncherEffect } from './effects/damage-modify/mega-launcher-effect';
import { ToughClawsEffect } from './effects/damage-modify/tough-claws-effect';
import { LongReachEffect } from './effects/other/long-reach-effect';
import { LiquidVoiceEffect } from './effects/other/liquid-voice-effect';
import { TriageEffect } from './effects/other/triage-effect';

describe('AbilityRegistry（技フラグを使う特性）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it.each([
    ['メガランチャー', MegaLauncherEffect],
    ['かたいツメ', ToughClawsEffect],
    ['えんかく', LongReachEffect],
    ['うるおいボイス', LiquidVoiceEffect],
    ['ヒーリングシフト', TriageEffect],
  ])('%s が DB の特性名で登録されている', (name, effectClass) => {
    // Act
    const effect = AbilityRegistry.get(name);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
  });
});
