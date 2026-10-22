import { getHighestStat } from './highest-stat';
import { BattlePokemonStatus } from '../entities/battle-pokemon-status.entity';

describe('getHighestStat', () => {
  const createStatus = (attackRank: number, speedRank: number): BattlePokemonStatus =>
    new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, attackRank, 0, 0, 0, speedRank, 0, 0, null);

  it('ランク補正込みで一番高い能力を返す', () => {
    // Arrange
    const stats = { attack: 100, defense: 90, specialAttack: 80, specialDefense: 70, speed: 120 };

    // Act
    const result = getHighestStat(stats, createStatus(1, 0));

    // Assert
    expect(result).toBe('attack');
  });

  it('同じ値の場合は 攻撃・防御・特攻・特防・素早さ の順で先の能力を返す', () => {
    // Arrange
    const stats = {
      attack: 100,
      defense: 100,
      specialAttack: 100,
      specialDefense: 100,
      speed: 100,
    };

    // Act
    const result = getHighestStat(stats, createStatus(0, 0));

    // Assert
    expect(result).toBe('attack');
  });

  it('素早さが一番高い場合はspeedを返す', () => {
    // Arrange
    const stats = { attack: 100, defense: 90, specialAttack: 80, specialDefense: 70, speed: 120 };

    // Act
    const result = getHighestStat(stats, createStatus(0, 0));

    // Assert
    expect(result).toBe('speed');
  });
});
