import { AirLockEffect } from './air-lock-effect';
import { AbilityRegistry } from '../../ability-registry';
import { resolveEffectiveWeather } from '@/modules/battle/domain/logic/effective-weather';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';

describe('AirLockEffect', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('場にいる間、天候の効果をなくす特性として扱われる', () => {
    // Arrange
    const effect = new AirLockEffect();

    // Act & Assert
    expect(effect.suppressesWeather).toBe(true);
  });

  it('エアロックが場にいると、雨は効果のない天候になる', () => {
    // Arrange & Act
    const weather = resolveEffectiveWeather(Weather.Rain, ['いかく', 'エアロック']);

    // Assert
    expect(weather).toBe(Weather.None);
  });

  it('エアロックが相手側にいても、晴れは効果のない天候になる', () => {
    // Arrange & Act
    const weather = resolveEffectiveWeather(Weather.Sun, ['エアロック', undefined]);

    // Assert
    expect(weather).toBe(Weather.None);
  });
});
