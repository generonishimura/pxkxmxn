import { StallEffect } from './stall-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';

describe('StallEffect', () => {
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);
  const effect = new StallEffect();

  it('素早さを 0 にして同じ優先度の中で最後に行動させる', () => {
    // Arrange
    const speed = 200;

    // Act
    const result = effect.modifySpeed(pokemon, speed);

    // Assert
    expect(result).toBe(0);
  });

  it('素早さが元々 0 でも 0 を返す', () => {
    // Arrange
    const speed = 0;

    // Act
    const result = effect.modifySpeed(pokemon, speed);

    // Assert
    expect(result).toBe(0);
  });
});
