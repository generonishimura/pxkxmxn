import { SleepTalkEffect } from './sleep-talk-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattlePokemonMove } from '@/modules/battle/domain/entities/battle-pokemon-move.entity';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';
import { VolatileState } from '@/modules/battle/domain/state/volatile-state';
import { BattleContext } from '../../abilities/battle-context.interface';
import { Move, MoveCategory } from '../../entities/move.entity';
import { Type } from '../../entities/type.entity';
import { IMoveRepository } from '../../pokemon.repository.interface';

const NORMAL = new Type(1, 'ノーマル', 'Normal');

const moveOf = (id: number, name: string): Move =>
  new Move(id, name, name, NORMAL, MoveCategory.Physical, 80, 100, 10, 0, null);

const ATTACKER_ID = 1;

const statusOf = (
  id: number,
  statusCondition: StatusCondition | null = null,
  volatileState: VolatileState = {},
): BattlePokemonStatus =>
  new BattlePokemonStatus(
    id,
    1,
    id,
    id,
    true,
    100,
    100,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    statusCondition,
    volatileState,
  );

const SLEEP_TALK = moveOf(214, 'ねごと');

/** 自分の技の欄（ID 1 から順に、指定した技を入れる） */
const contextOf = (moves: Move[]): BattleContext & { callMove: jest.Mock } => {
  const allMoves = [SLEEP_TALK, ...moves];
  const slots = allMoves.map(
    (move, index) => new BattlePokemonMove(index + 1, ATTACKER_ID, move.id, 0, 10),
  );
  const moveRepository: Pick<IMoveRepository, 'findById'> = {
    findById: (id: number) => Promise.resolve(allMoves.find(move => move.id === id) ?? null),
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

describe('SleepTalkEffect（ねごと）', () => {
  const effect = new SleepTalkEffect();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('ねむっていなければ失敗する', () => {
    // Arrange
    const ctx = contextOf([]);
    const attacker = statusOf(ATTACKER_ID);

    // Act
    const fails = effect.shouldFail(attacker, statusOf(2), { ...ctx, attacker });

    // Assert
    expect(fails).toBe(true);
  });

  it('ねむっていれば、shouldFail では失敗しない', () => {
    // Arrange
    const ctx = contextOf([]);
    const attacker = statusOf(ATTACKER_ID, StatusCondition.Sleep);

    // Act
    const fails = effect.shouldFail(attacker, statusOf(2), { ...ctx, attacker });

    // Assert
    expect(fails).toBe(false);
  });

  it('ぜったいねむりなら、状態異常がなくても出せる', () => {
    // Arrange
    const ctx = contextOf([]);
    const attacker = statusOf(ATTACKER_ID);

    // Act
    const fails = effect.shouldFail(attacker, statusOf(2), {
      ...ctx,
      attacker,
      attackerEffectiveStatus: StatusCondition.Sleep,
    });

    // Assert
    expect(fails).toBe(false);
  });

  it('自分の技から 1 つを選んで出す（PP が 0 の技も選べる）', async () => {
    // Arrange
    const ctx = contextOf([moveOf(33, 'たいあたり')]);

    // Act
    const message = await effect.onUse(
      statusOf(ATTACKER_ID, StatusCondition.Sleep),
      statusOf(2),
      ctx,
    );

    // Assert
    expect(ctx.callMove).toHaveBeenCalledWith({ moveId: 33, calledBy: 'ねごと' });
    expect(message).toBe('Used たいあたり and dealt 30 damage');
  });

  it('ため技とねごとで出せない技は選ばない', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const ctx = contextOf([
      moveOf(76, 'ソーラービーム'),
      moveOf(19, 'そらをとぶ'),
      moveOf(118, 'ゆびをふる'),
      moveOf(85, '１０まんボルト'),
    ]);

    // Act
    await effect.onUse(statusOf(ATTACKER_ID, StatusCondition.Sleep), statusOf(2), ctx);

    // Assert
    expect(ctx.callMove).toHaveBeenCalledWith({ moveId: 85, calledBy: 'ねごと' });
  });

  it('候補の中から乱数で選ぶ', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    const ctx = contextOf([moveOf(33, 'たいあたり'), moveOf(85, '１０まんボルト')]);

    // Act
    await effect.onUse(statusOf(ATTACKER_ID, StatusCondition.Sleep), statusOf(2), ctx);

    // Assert
    expect(ctx.callMove).toHaveBeenCalledWith({ moveId: 85, calledBy: 'ねごと' });
  });

  it('ものまねで入れ替えた技も候補にする', async () => {
    // Arrange
    const ctx = contextOf([moveOf(33, 'たいあたり')]);
    const attacker = statusOf(ATTACKER_ID, StatusCondition.Sleep, {
      moveSlotOverrides: [{ battlePokemonMoveId: 2, moveId: 85, currentPp: 5, maxPp: 5 }],
    });
    const moveRepository: Pick<IMoveRepository, 'findById'> = {
      findById: (id: number) =>
        Promise.resolve([SLEEP_TALK, moveOf(85, '１０まんボルト')].find(m => m.id === id) ?? null),
    };

    // Act
    await effect.onUse(attacker, statusOf(2), {
      ...ctx,
      moveRepository: moveRepository as IMoveRepository,
    });

    // Assert
    expect(ctx.callMove).toHaveBeenCalledWith({ moveId: 85, calledBy: 'ねごと' });
  });

  it('出せる技がなければ失敗する', async () => {
    // Arrange
    const ctx = contextOf([moveOf(76, 'ソーラービーム')]);

    // Act
    const message = await effect.onUse(
      statusOf(ATTACKER_ID, StatusCondition.Sleep),
      statusOf(2),
      ctx,
    );

    // Assert
    expect(message).toBe('But it failed');
    expect(ctx.callMove).not.toHaveBeenCalled();
  });
});
