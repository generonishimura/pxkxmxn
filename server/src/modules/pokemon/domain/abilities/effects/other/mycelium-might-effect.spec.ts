import { MyceliumMightEffect } from './mycelium-might-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('MyceliumMightEffect', () => {
  const holder = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);
  const createContext = (moveCategory: BattleContext['moveCategory']): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    moveCategory,
  });

  it('変化技なら、同じ優先度の中で最後に動くよう優先度に -0.1 を足す', () => {
    // Arrange
    const effect = new MyceliumMightEffect();

    // Act
    const result = effect.modifyFractionalPriority(holder, createContext('Status'));

    // Assert
    expect(result).toBe(-0.1);
  });

  it('攻撃技なら行動順を変えない', () => {
    // Arrange
    const effect = new MyceliumMightEffect();

    // Act
    const result = effect.modifyFractionalPriority(holder, createContext('Special'));

    // Assert
    expect(result).toBeUndefined();
  });

  it('変化技なら、相手の特性を無視する', () => {
    // Arrange
    const effect = new MyceliumMightEffect();

    // Act
    const result = effect.breaksMoldFor(createContext('Status'));

    // Assert
    expect(result).toBe(true);
  });

  it('攻撃技では、相手の特性を無視しない', () => {
    // Arrange
    const effect = new MyceliumMightEffect();

    // Act
    const result = effect.breaksMoldFor(createContext('Physical'));

    // Assert
    expect(result).toBe(false);
  });

  it('素早さは変えない（トリックルームで順番が逆にならない）', () => {
    // Arrange
    const effect = new MyceliumMightEffect();

    // Act
    const hasModifySpeed = 'modifySpeed' in effect;

    // Assert
    expect(hasModifySpeed).toBe(false);
  });
});
