import { AbilityRegistry } from './ability-registry';
import { ForecastEffect } from './effects/form-change/forecast-effect';

describe('AbilityRegistry（フォルムを変える特性）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it.each([['てんきや', ForecastEffect]])('%s が登録されている', (name, effectClass) => {
    // Act
    const effect = AbilityRegistry.get(name);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
  });
});
