import { resolveEffectiveWeather, resolveMoveWeather } from './effective-weather';
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

describe('resolveMoveWeather', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    AbilityRegistry.register('テストてんき', { suppressesWeather: true });
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('攻撃側がメガソーラーなら、雨でも晴れとして扱う', () => {
    // Arrange & Act
    const weather = resolveMoveWeather(Weather.Rain, 'メガソーラー', 'いかく');

    // Assert
    expect(weather).toBe(Weather.Sun);
  });

  it('攻撃側がメガソーラーなら、天候がなくても晴れとして扱う', () => {
    // Arrange & Act
    const weather = resolveMoveWeather(null, 'メガソーラー', undefined);

    // Assert
    expect(weather).toBe(Weather.Sun);
  });

  it('攻撃側がメガソーラーなら、天候を消す特性が場にいても晴れとして扱う', () => {
    // Arrange & Act
    const weather = resolveMoveWeather(Weather.None, 'メガソーラー', 'テストてんき');

    // Assert
    expect(weather).toBe(Weather.Sun);
  });

  it('防御側のメガソーラーは、相手の技の天候を変えない', () => {
    // Arrange & Act
    const weather = resolveMoveWeather(Weather.Rain, 'いかく', 'メガソーラー');

    // Assert
    expect(weather).toBe(Weather.Rain);
  });

  it('メガソーラーがいなければ、効果のある天候を返す', () => {
    // Arrange & Act
    const weather = resolveMoveWeather(Weather.Sun, 'いかく', 'テストてんき');

    // Assert
    expect(weather).toBe(Weather.None);
  });
});
