import { DampEffect } from './damp-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('DampEffect', () => {
  const holder = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);
  const createContext = (moveName: string): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    moveName,
  });

  it.each(['だいばくはつ', 'じばく', 'ビックリヘッド', 'ミストバースト'])(
    '%s を相手が使うと失敗させる',
    moveName => {
      // Arrange
      const effect = new DampEffect();

      // Act
      const prevented = effect.preventsMove(holder, 'defender', createContext(moveName));

      // Assert
      expect(prevented).toBe(true);
    },
  );

  it('自分が だいばくはつ を使っても失敗させる', () => {
    // Arrange
    const effect = new DampEffect();

    // Act
    const prevented = effect.preventsMove(holder, 'attacker', createContext('だいばくはつ'));

    // Assert
    expect(prevented).toBe(true);
  });

  it('爆発する技でなければ失敗させない', () => {
    // Arrange
    const effect = new DampEffect();

    // Act
    const prevented = effect.preventsMove(holder, 'defender', createContext('たいあたり'));

    // Assert
    expect(prevented).toBe(false);
  });

  it('コンテキストがなければ失敗させない', () => {
    // Arrange
    const effect = new DampEffect();

    // Act
    const prevented = effect.preventsMove(holder, 'defender', undefined);

    // Assert
    expect(prevented).toBe(false);
  });
});
