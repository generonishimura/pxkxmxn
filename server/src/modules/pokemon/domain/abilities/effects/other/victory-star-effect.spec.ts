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

  it('100 を超える場合は 100 に制限する', () => {
    // Arrange
    const accuracy = 95;

    // Act
    const result = effect.modifyAccuracy(pokemon, accuracy);

    // Assert
    expect(result).toBe(100);
  });
});
