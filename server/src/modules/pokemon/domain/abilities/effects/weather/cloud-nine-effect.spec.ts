import { CloudNineEffect } from './cloud-nine-effect';
import { AbilityRegistry } from '../../ability-registry';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';
import { resolveEffectiveWeather } from '@/modules/battle/domain/logic/effective-weather';

describe('CloudNineEffect', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('場にいる間、天候の効果をなくす', () => {
    // Arrange
    const effect = new CloudNineEffect();

    // Act
    const suppresses = effect.suppressesWeather;

    // Assert
    expect(suppresses).toBe(true);
  });

  it.each([Weather.Sun, Weather.Rain, Weather.Sandstorm])(
    'ノーてんき が場にいると、天候 %s の効果がなくなる',
    weather => {
      // Act
      const effective = resolveEffectiveWeather(weather, ['いかく', 'ノーてんき']);

      // Assert
      expect(effective).toBe(Weather.None);
    },
  );

  it('ノーてんき が場にいなければ、天候はそのまま', () => {
    // Act
    const effective = resolveEffectiveWeather(Weather.Rain, ['いかく', undefined]);

    // Assert
    expect(effective).toBe(Weather.Rain);
  });
});
