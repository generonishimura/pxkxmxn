import { AbilityRegistry } from './ability-registry';
import { MoldBreakerEffect } from './effects/mold-breaker-effect';

describe('AbilityRegistry.hasMoldBreaker', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('かたやぶりはtrueを返す', () => {
    // Arrange & Act
    const result = AbilityRegistry.hasMoldBreaker('かたやぶり');

    // Assert
    expect(result).toBe(true);
  });

  it('MoldBreakerEffect を登録した別名の特性もtrueを返す', () => {
    // Arrange
    AbilityRegistry.register('テストかたやぶり', new MoldBreakerEffect());

    // Act
    const result = AbilityRegistry.hasMoldBreaker('テストかたやぶり');

    // Assert
    expect(result).toBe(true);
  });

  it('breaksMold を持たない特性はfalseを返す', () => {
    // Arrange & Act
    const result = AbilityRegistry.hasMoldBreaker('いかく');

    // Assert
    expect(result).toBe(false);
  });

  it('特性名がない場合はfalseを返す', () => {
    // Arrange & Act
    const result = AbilityRegistry.hasMoldBreaker(undefined);

    // Assert
    expect(result).toBe(false);
  });
});
