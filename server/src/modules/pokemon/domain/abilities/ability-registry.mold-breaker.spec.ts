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

describe('AbilityRegistry.isIgnoredByMoldBreaker', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    AbilityRegistry.register('テストよろい', { unaffectedByMoldBreaker: true });
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('攻撃側がかたやぶりなら、防御側の特性は無視される', () => {
    // Arrange & Act
    const result = AbilityRegistry.isIgnoredByMoldBreaker('かたやぶり', 'マルチスケイル');

    // Assert
    expect(result).toBe(true);
  });

  it('unaffectedByMoldBreaker の特性は、かたやぶりでも無視されない', () => {
    // Arrange & Act
    const result = AbilityRegistry.isIgnoredByMoldBreaker('かたやぶり', 'テストよろい');

    // Assert
    expect(result).toBe(false);
  });

  it('攻撃側がかたやぶりでなければ無視されない', () => {
    // Arrange & Act
    const result = AbilityRegistry.isIgnoredByMoldBreaker('いかく', 'マルチスケイル');

    // Assert
    expect(result).toBe(false);
  });
});
