import { AbilityRegistry } from './ability-registry';
import { MoldBreakerEffect } from './effects/mold-breaker-effect';
import { GaleWingsEffect } from './effects/other/gale-wings-effect';
import { ParentalBondEffect } from './effects/other/parental-bond-effect';
import { DarkAuraEffect } from './effects/damage-modify/dark-aura-effect';

describe('AbilityRegistry（かたやぶり系・はやてのつばさ・おやこあい・ダークオーラ）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it.each([
    ['ターボブレイズ', MoldBreakerEffect],
    ['テラボルテージ', MoldBreakerEffect],
    ['はやてのつばさ', GaleWingsEffect],
    ['おやこあい', ParentalBondEffect],
    ['ダークオーラ', DarkAuraEffect],
  ])('%s が登録されている', (name, effectClass) => {
    // Act
    const effect = AbilityRegistry.get(name);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
  });

  it.each(['ターボブレイズ', 'テラボルテージ'])('%s はかたやぶりとして扱われる', name => {
    // Act
    const result = AbilityRegistry.hasMoldBreaker(name);

    // Assert
    expect(result).toBe(true);
  });

  it.each(['ターボブレイズ', 'テラボルテージ'])('%s の攻撃では、防御側の特性が無視される', name => {
    // Act
    const result = AbilityRegistry.isIgnoredByMoldBreaker(name, 'マルチスケイル');

    // Assert
    expect(result).toBe(true);
  });
});
