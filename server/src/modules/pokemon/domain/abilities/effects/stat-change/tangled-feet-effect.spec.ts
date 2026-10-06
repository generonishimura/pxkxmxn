import { TangledFeetEffect } from './tangled-feet-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

describe('TangledFeetEffect', () => {
  const createPokemon = (statusCondition: StatusCondition | null): BattlePokemonStatus =>
    new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, statusCondition);

  const effect = new TangledFeetEffect();

  it('こんらん状態のとき回避補正 0.5 を返す（相手の命中率が半分になる）', () => {
    // Arrange
    const pokemon = createPokemon(StatusCondition.Confusion);

    // Act
    const result = effect.modifyEvasion(pokemon, 100);

    // Assert
    expect(result).toBe(0.5);
  });

  it('こんらん以外の状態異常では補正しない', () => {
    // Arrange
    const pokemon = createPokemon(StatusCondition.Paralysis);

    // Act
    const result = effect.modifyEvasion(pokemon, 100);

    // Assert
    expect(result).toBeUndefined();
  });

  it('状態異常がないときは補正しない', () => {
    // Arrange
    const pokemon = createPokemon(null);

    // Act
    const result = effect.modifyEvasion(pokemon, 100);

    // Assert
    expect(result).toBeUndefined();
  });
});
