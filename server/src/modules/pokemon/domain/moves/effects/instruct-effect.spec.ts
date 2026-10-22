import { InstructEffect } from './instruct-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattlePokemonMove } from '@/modules/battle/domain/entities/battle-pokemon-move.entity';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';
import { VolatileState } from '@/modules/battle/domain/state/volatile-state';
import { BattleContext } from '../../abilities/battle-context.interface';
import { Move, MoveCategory } from '../../entities/move.entity';
import { Type } from '../../entities/type.entity';
import { IMoveRepository } from '../../pokemon.repository.interface';

const NORMAL = new Type(1, 'ノーマル', 'Normal');

const moveOf = (id: number, name: string): Move =>
  new Move(id, name, name, NORMAL, MoveCategory.Physical, 80, 100, 10, 0, null);

const statusOf = (id: number, volatileState: VolatileState = {}): BattlePokemonStatus =>
  new BattlePokemonStatus(id, 1, id, id, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null, volatileState);

const DEFENDER_ID = 2;

const contextOf = (
  moves: Move[],
  slots: BattlePokemonMove[],
): BattleContext & { callMove: jest.Mock } => {
  const moveRepository: Pick<IMoveRepository, 'findById'> = {
    findById: (id: number) => Promise.resolve(moves.find(move => move.id === id) ?? null),
  };
  const battleRepository: Pick<IBattleRepository, 'findBattlePokemonMovesByBattlePokemonStatusId'> =
    {
      findBattlePokemonMovesByBattlePokemonStatusId: (statusId: number) =>
        Promise.resolve(slots.filter(slot => slot.battlePokemonStatusId === statusId)),
    };
  return {
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    moveRepository: moveRepository as IMoveRepository,
    battleRepository: battleRepository as IBattleRepository,
    callMove: jest.fn().mockResolvedValue('Used たいあたり and dealt 30 damage'),
  };
};

describe('InstructEffect（さいはい）', () => {
  const effect = new InstructEffect();
  const attacker = statusOf(1);

  it('相手に、相手が最後に出した技をもう一度出させる（技を出す前の判定と PP の消費つき）', async () => {
    // Arrange
    const defender = statusOf(DEFENDER_ID, { lastMoveId: 33 });
    const ctx = contextOf(
      [moveOf(33, 'たいあたり')],
      [new BattlePokemonMove(5, DEFENDER_ID, 33, 10, 35)],
    );

    // Act
    const message = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(ctx.callMove).toHaveBeenCalledWith({
      moveId: 33,
      user: defender,
      calledBy: 'さいはい',
      runBeforeMoveChecks: true,
      consumePp: true,
    });
    expect(message).toBe('Used たいあたり and dealt 30 damage');
  });

  it('相手がまだ技を出していなければ失敗する', () => {
    // Arrange
    const ctx = contextOf([], []);

    // Act
    const fails = effect.shouldFail(attacker, statusOf(DEFENDER_ID), ctx);

    // Assert
    expect(fails).toBe(true);
  });

  it('相手がくちばしキャノンをためているときは失敗する', () => {
    // Arrange
    const ctx = contextOf([], []);
    const defender = statusOf(DEFENDER_ID, { lastMoveId: 33, beakBlast: true });

    // Act
    const fails = effect.shouldFail(attacker, defender, ctx);

    // Assert
    expect(fails).toBe(true);
  });

  it('相手が最後に出した技があれば、shouldFail では失敗しない', () => {
    // Arrange
    const ctx = contextOf([], []);

    // Act
    const fails = effect.shouldFail(attacker, statusOf(DEFENDER_ID, { lastMoveId: 33 }), ctx);

    // Assert
    expect(fails).toBe(false);
  });

  it.each([
    ['さいはいで出せない技', 'げきりん'],
    ['ため技', 'ソーラービーム'],
    ['反動で動けなくなる技', 'はかいこうせん'],
  ])('相手が最後に出した技が%s（%s）なら失敗する', async (_label, name) => {
    // Arrange
    const defender = statusOf(DEFENDER_ID, { lastMoveId: 7 });
    const ctx = contextOf([moveOf(7, name)], [new BattlePokemonMove(5, DEFENDER_ID, 7, 5, 5)]);

    // Act
    const message = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(message).toBe('But it failed');
    expect(ctx.callMove).not.toHaveBeenCalled();
  });

  it('相手が最後に出した技の PP が 0 なら失敗する', async () => {
    // Arrange
    const defender = statusOf(DEFENDER_ID, { lastMoveId: 33 });
    const ctx = contextOf(
      [moveOf(33, 'たいあたり')],
      [new BattlePokemonMove(5, DEFENDER_ID, 33, 0, 35)],
    );

    // Act
    const message = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(message).toBe('But it failed');
    expect(ctx.callMove).not.toHaveBeenCalled();
  });

  it('相手が最後に出した技が、もう技の欄にないなら失敗する', async () => {
    // Arrange
    const defender = statusOf(DEFENDER_ID, { lastMoveId: 33 });
    const ctx = contextOf([moveOf(33, 'たいあたり')], []);

    // Act
    const message = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(message).toBe('But it failed');
    expect(ctx.callMove).not.toHaveBeenCalled();
  });

  it('ものまねで入れ替えた技の欄も、PP を見て出させる', async () => {
    // Arrange
    const defender = statusOf(DEFENDER_ID, {
      lastMoveId: 85,
      moveSlotOverrides: [{ battlePokemonMoveId: 5, moveId: 85, currentPp: 5, maxPp: 5 }],
    });
    const ctx = contextOf(
      [moveOf(85, '１０まんボルト')],
      [new BattlePokemonMove(5, DEFENDER_ID, 102, 10, 10)],
    );

    // Act
    await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(ctx.callMove).toHaveBeenCalledWith(expect.objectContaining({ moveId: 85 }));
  });
});
