import { GoodAsGoldEffect } from './good-as-gold-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('GoodAsGoldEffect', () => {
  const holder = new BattlePokemonStatus(2, 1, 2, 2, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);
  const createContext = (moveCategory: 'Physical' | 'Special' | 'Status'): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    moveCategory,
  });

  it('相手の変化技を無効にする', () => {
    // Arrange
    const effect = new GoodAsGoldEffect();

    // Act
    const immune = effect.isImmuneToMove(holder, createContext('Status'));

    // Assert
    expect(immune).toBe(true);
  });

  it.each(['Physical', 'Special'] as const)('分類が %s の技は無効にしない', moveCategory => {
    // Arrange
    const effect = new GoodAsGoldEffect();

    // Act
    const immune = effect.isImmuneToMove(holder, createContext(moveCategory));

    // Assert
    expect(immune).toBe(false);
  });

  it('コンテキストがなければ無効にしない', () => {
    // Arrange
    const effect = new GoodAsGoldEffect();

    // Act
    const immune = effect.isImmuneToMove(holder, undefined);

    // Assert
    expect(immune).toBe(false);
  });
});
