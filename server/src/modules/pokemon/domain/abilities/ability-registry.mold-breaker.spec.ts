import { AbilityRegistry } from './ability-registry';
import { MoldBreakerEffect } from './effects/mold-breaker-effect';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { BattleContext } from './battle-context.interface';

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

describe('AbilityRegistry - 技によってかたやぶりになる特性（breaksMoldFor）', () => {
  const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);
  const statusMove: BattleContext = { battle, moveCategory: 'Status' };
  const physicalMove: BattleContext = { battle, moveCategory: 'Physical' };

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    // きんしのちから相当: 変化技のときだけ相手の特性を無視する
    AbilityRegistry.register('テストのきんし', {
      breaksMoldFor: ctx => ctx?.moveCategory === 'Status',
    });
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('breaksMoldFor が true を返す技では、かたやぶりとして扱う', () => {
    // Act
    const result = AbilityRegistry.hasMoldBreaker('テストのきんし', statusMove);

    // Assert
    expect(result).toBe(true);
  });

  it('breaksMoldFor が true を返さない技では、かたやぶりとして扱わない', () => {
    // Act
    const result = AbilityRegistry.hasMoldBreaker('テストのきんし', physicalMove);

    // Assert
    expect(result).toBe(false);
  });

  it('isIgnoredByMoldBreaker にもコンテキストが渡る', () => {
    // Act
    const statusResult = AbilityRegistry.isIgnoredByMoldBreaker(
      'テストのきんし',
      'じゅうなん',
      statusMove,
    );
    const physicalResult = AbilityRegistry.isIgnoredByMoldBreaker(
      'テストのきんし',
      'じゅうなん',
      physicalMove,
    );

    // Assert
    expect(statusResult).toBe(true);
    expect(physicalResult).toBe(false);
  });
});
