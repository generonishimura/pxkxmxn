import { VictoryStarEffect } from './victory-star-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';

describe('VictoryStarEffect', () => {
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);
  const effect = new VictoryStarEffect();

  it('命中率を 1.1 倍にする', () => {
    // Arrange
    const accuracy = 70;

    // Act
    const result = effect.modifyAccuracy(pokemon, accuracy);

    // Assert
    expect(result).toBe(77);
  });

  it('小数点以下は切り捨てる', () => {
    // Arrange
    const accuracy = 85;

    // Act
    const result = effect.modifyAccuracy(pokemon, accuracy);

    // Assert
    expect(result).toBe(93); // 85 * 1.1 = 93.5 → 93
  });

  it('100 を超えても上限を付けない（最終の 0〜100 の制限は命中判定で行う）', () => {
    // Arrange
    const accuracy = 120;

    // Act
    const result = effect.modifyAccuracy(pokemon, accuracy);

    // Assert
    expect(result).toBe(132);
  });
});
