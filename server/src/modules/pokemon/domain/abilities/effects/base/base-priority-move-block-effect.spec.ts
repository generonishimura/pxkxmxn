import { BasePriorityMoveBlockEffect } from './base-priority-move-block-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

class TestPriorityMoveBlockEffect extends BasePriorityMoveBlockEffect {}

describe('BasePriorityMoveBlockEffect', () => {
  const holder = new BattlePokemonStatus(2, 1, 2, 2, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);
  const createContext = (moveName: string, effectivePriority: number): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    moveName,
    effectivePriority,
  });

  it('相手の優先度が1以上の技を失敗させる', () => {
    // Arrange
    const effect = new TestPriorityMoveBlockEffect();

    // Act
    const prevented = effect.preventsMove(holder, 'defender', createContext('でんこうせっか', 1));

    // Assert
    expect(prevented).toBe(true);
  });

  it('いたずらごころで優先度が上がった変化技も失敗させる', () => {
    // Arrange
    const effect = new TestPriorityMoveBlockEffect();

    // Act
    const prevented = effect.preventsMove(holder, 'defender', createContext('でんじは', 1));

    // Assert
    expect(prevented).toBe(true);
  });

  it('優先度が0以下の技は失敗させない', () => {
    // Arrange
    const effect = new TestPriorityMoveBlockEffect();

    // Act
    const prevented = effect.preventsMove(holder, 'defender', createContext('たいあたり', 0));

    // Assert
    expect(prevented).toBe(false);
  });

  it('自分を対象にする優先度の高い技（まもる）は失敗させない', () => {
    // Arrange
    const effect = new TestPriorityMoveBlockEffect();

    // Act
    const prevented = effect.preventsMove(holder, 'defender', createContext('まもる', 4));

    // Assert
    expect(prevented).toBe(false);
  });

  it('相手の場を対象にする技（まきびし）は優先度が上がっても失敗させない', () => {
    // Arrange
    const effect = new TestPriorityMoveBlockEffect();

    // Act
    const prevented = effect.preventsMove(holder, 'defender', createContext('まきびし', 1));

    // Assert
    expect(prevented).toBe(false);
  });

  it.each(['ほろびのうた', 'フラワーガード', 'たがやす'])(
    '場全体の技でも %s は優先度が上がると失敗させる',
    moveName => {
      // Arrange
      const effect = new TestPriorityMoveBlockEffect();

      // Act
      const prevented = effect.preventsMove(holder, 'defender', createContext(moveName, 1));

      // Assert
      expect(prevented).toBe(true);
    },
  );

  it('場全体の天候技（あまごい）は優先度が上がっても失敗させない', () => {
    // Arrange
    const effect = new TestPriorityMoveBlockEffect();

    // Act
    const prevented = effect.preventsMove(holder, 'defender', createContext('あまごい', 1));

    // Assert
    expect(prevented).toBe(false);
  });

  it('自分が優先度の高い技を使っても失敗させない', () => {
    // Arrange
    const effect = new TestPriorityMoveBlockEffect();

    // Act
    const prevented = effect.preventsMove(holder, 'attacker', createContext('でんこうせっか', 1));

    // Assert
    expect(prevented).toBe(false);
  });

  it('コンテキストがなければ失敗させない', () => {
    // Arrange
    const effect = new TestPriorityMoveBlockEffect();

    // Act
    const prevented = effect.preventsMove(holder, 'defender', undefined);

    // Assert
    expect(prevented).toBe(false);
  });
});
