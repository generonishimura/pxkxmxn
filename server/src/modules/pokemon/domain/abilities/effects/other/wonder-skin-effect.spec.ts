import { WonderSkinEffect } from './wonder-skin-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('WonderSkinEffect', () => {
  const holder = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);
  const createContext = (moveCategory: BattleContext['moveCategory']): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    moveCategory,
  });

  it('自分が受ける変化技の命中率を 50 にする', () => {
    // Arrange
    const effect = new WonderSkinEffect();

    // Act
    const result = effect.modifyBaseAccuracy(holder, 'defender', 100, createContext('Status'));

    // Assert
    expect(result).toBe(50);
  });

  it('攻撃技の命中率は変えない', () => {
    // Arrange
    const effect = new WonderSkinEffect();

    // Act
    const result = effect.modifyBaseAccuracy(holder, 'defender', 100, createContext('Physical'));

    // Assert
    expect(result).toBeUndefined();
  });

  it('自分が使う変化技の命中率は変えない', () => {
    // Arrange
    const effect = new WonderSkinEffect();

    // Act
    const result = effect.modifyBaseAccuracy(holder, 'attacker', 100, createContext('Status'));

    // Assert
    expect(result).toBeUndefined();
  });
});
