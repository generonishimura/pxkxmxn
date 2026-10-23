import { AccuracyCalculator } from './accuracy-calculator';
import { BattlePokemonStatus } from '../entities/battle-pokemon-status.entity';
import { Battle, BattleStatus } from '../entities/battle.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { ItemRegistry } from '@/modules/pokemon/domain/items/item-registry';

describe('AccuracyCalculator - 持ち物', () => {
  const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);

  const createStatus = (id: number, item?: string): BattlePokemonStatus =>
    new BattlePokemonStatus(
      id,
      1,
      id,
      id,
      true,
      100,
      100,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      null,
      {},
      item === undefined ? {} : { item },
    );

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    ItemRegistry.initialize();
    // 命中の乱数を 60（命中率 60 以下なら外れる）にする
    jest.spyOn(Math, 'random').mockReturnValue(0.6);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('攻撃側の持ち物の modifyAccuracy が命中率を変える', () => {
    // Arrange
    ItemRegistry.register('テストの命中アップ', { modifyAccuracy: () => 100 });

    // Act
    const hit = AccuracyCalculator.checkHit(
      50,
      createStatus(1, 'テストの命中アップ'),
      createStatus(2),
      undefined,
      undefined,
      { battle },
    );

    // Assert
    expect(hit).toBe(true);
  });

  it('攻撃側の持ち物の modifyAccuracy は、攻撃側の特性の補正のあとの命中率を受け取る', () => {
    // Arrange
    AbilityRegistry.register('テストの命中特性', { modifyAccuracy: () => 70 });
    const received: number[] = [];
    ItemRegistry.register('テストの命中を見る', {
      modifyAccuracy: (_holder, accuracy) => {
        received.push(accuracy);
        return undefined;
      },
    });

    // Act
    AccuracyCalculator.checkHit(
      50,
      createStatus(1, 'テストの命中を見る'),
      createStatus(2),
      'テストの命中特性',
      undefined,
      { battle },
    );

    // Assert
    expect(received).toEqual([70]);
  });

  it('防御側の持ち物の modifyAccuracy は使わない（命中率を変えるのは攻撃側の持ち物だけ）', () => {
    // Arrange
    ItemRegistry.register('テストの命中アップ', { modifyAccuracy: () => 100 });

    // Act
    const hit = AccuracyCalculator.checkHit(
      50,
      createStatus(1),
      createStatus(2, 'テストの命中アップ'),
      undefined,
      undefined,
      { battle },
    );

    // Assert
    expect(hit).toBe(false);
  });

  it('防御側の持ち物の modifyEvasion が命中率を下げる', () => {
    // Arrange
    ItemRegistry.register('テストの回避', { modifyEvasion: () => 0.5 });

    // Act
    const hit = AccuracyCalculator.checkHit(
      100,
      createStatus(1),
      createStatus(2, 'テストの回避'),
      undefined,
      undefined,
      { battle },
    );

    // Assert
    expect(hit).toBe(false);
  });

  it('防御側の持ち物の modifyEvasion は、攻撃側がかたやぶりでも働く', () => {
    // Arrange
    ItemRegistry.register('テストの回避', { modifyEvasion: () => 0.5 });

    // Act
    const hit = AccuracyCalculator.checkHit(
      100,
      createStatus(1),
      createStatus(2, 'テストの回避'),
      'かたやぶり',
      undefined,
      { battle },
    );

    // Assert
    expect(hit).toBe(false);
  });
});
