import { CopycatEffect } from './copycat-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { Move, MoveCategory } from '../../entities/move.entity';
import { Type } from '../../entities/type.entity';
import { IMoveRepository } from '../../pokemon.repository.interface';

const NORMAL = new Type(1, 'ノーマル', 'Normal');

const moveOf = (id: number, name: string): Move =>
  new Move(id, name, name, NORMAL, MoveCategory.Physical, 80, 100, 10, 0, null);

const statusOf = (id: number): BattlePokemonStatus =>
  new BattlePokemonStatus(id, 1, id, id, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

const battleWithLastMove = (lastMoveId?: number): Battle =>
  new Battle(
    1,
    1,
    2,
    1,
    2,
    1,
    null,
    null,
    BattleStatus.Active,
    null,
    lastMoveId === undefined ? { sides: {} } : { sides: {}, global: { lastMoveId } },
  );

const contextOf = (battle: Battle, moves: Move[]): BattleContext & { callMove: jest.Mock } => {
  const moveRepository: Pick<IMoveRepository, 'findById'> = {
    findById: (id: number) => Promise.resolve(moves.find(move => move.id === id) ?? null),
  };
  return {
    battle,
    moveRepository: moveRepository as IMoveRepository,
    callMove: jest.fn().mockResolvedValue('Used たいあたり and dealt 30 damage'),
  };
};

describe('CopycatEffect（まねっこ）', () => {
  const effect = new CopycatEffect();

  it('バトルで最後に出た技を出す', async () => {
    // Arrange
    const ctx = contextOf(battleWithLastMove(33), [moveOf(33, 'たいあたり')]);

    // Act
    const message = await effect.onUse(statusOf(1), statusOf(2), ctx);

    // Assert
    expect(ctx.callMove).toHaveBeenCalledWith({ moveId: 33, calledBy: 'まねっこ' });
    expect(message).toBe('Used たいあたり and dealt 30 damage');
  });

  it('まだ誰も技を出していなければ失敗する', () => {
    // Arrange
    const ctx = contextOf(battleWithLastMove(), []);

    // Act
    const fails = effect.shouldFail(statusOf(1), statusOf(2), ctx);

    // Assert
    expect(fails).toBe(true);
  });

  it('バトルで最後に出た技があれば、shouldFail では失敗しない', () => {
    // Arrange
    const ctx = contextOf(battleWithLastMove(33), []);

    // Act
    const fails = effect.shouldFail(statusOf(1), statusOf(2), ctx);

    // Assert
    expect(fails).toBe(false);
  });

  it.each(['ゆびをふる', 'きあいパンチ', 'まねっこ'])(
    'まねっこで出せない技（%s）が最後に出た技なら失敗する',
    async name => {
      // Arrange
      const ctx = contextOf(battleWithLastMove(5), [moveOf(5, name)]);

      // Act
      const message = await effect.onUse(statusOf(1), statusOf(2), ctx);

      // Assert
      expect(message).toBe('But it failed');
      expect(ctx.callMove).not.toHaveBeenCalled();
    },
  );
});
