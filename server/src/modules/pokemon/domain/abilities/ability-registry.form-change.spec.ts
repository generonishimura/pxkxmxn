import { AbilityRegistry } from './ability-registry';
import { ForecastEffect } from './effects/form-change/forecast-effect';
import { ZenModeEffect } from './effects/form-change/zen-mode-effect';
import { StanceChangeEffect } from './effects/form-change/stance-change-effect';

describe('AbilityRegistry（フォルムを変える特性）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it.each([
    ['てんきや', ForecastEffect],
    ['ダルマモード', ZenModeEffect],
    ['バトルスイッチ', StanceChangeEffect],
  ])('%s が登録されている', (name, effectClass) => {
    // Act
    const effect = AbilityRegistry.get(name);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
  });
});
