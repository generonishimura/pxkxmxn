import { StallEffect } from './stall-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';

describe('StallEffect', () => {
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);
  const effect = new StallEffect();

  it('同じ優先度の中で最後に動くよう、優先度に -0.1 を足す', () => {
    // Act
    const result = effect.modifyFractionalPriority(pokemon);

    // Assert
    expect(result).toBe(-0.1);
  });

  it('素早さは変えない（トリックルームで順番が逆にならない）', () => {
    // Assert
    expect('modifySpeed' in effect).toBe(false);
  });
});
