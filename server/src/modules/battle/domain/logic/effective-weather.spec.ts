import { resolveEffectiveWeather } from './effective-weather';
import { Weather } from '../entities/battle.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';

describe('resolveEffectiveWeather', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    AbilityRegistry.register('テストてんき', { suppressesWeather: true });
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('天候を消す特性が場にいなければ、そのままの天候を返す', () => {
    // Arrange & Act
    const weather = resolveEffectiveWeather(Weather.Rain, ['いかく', undefined]);

    // Assert
    expect(weather).toBe(Weather.Rain);
  });

  it('天候を消す特性が場にいれば、天候なしを返す', () => {
    // Arrange & Act
    const weather = resolveEffectiveWeather(Weather.Sun, ['いかく', 'テストてんき']);

    // Assert
    expect(weather).toBe(Weather.None);
  });

  it('もとの天候がnullの場合はnullを返す', () => {
    // Arrange & Act
    const weather = resolveEffectiveWeather(null, ['テストてんき']);

    // Assert
    expect(weather).toBeNull();
  });
});
