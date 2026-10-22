import { MeFirstEffect } from './me-first-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { VolatileState } from '@/modules/battle/domain/state/volatile-state';
import { BattleContext } from '../../abilities/battle-context.interface';
import { Move, MoveCategory } from '../../entities/move.entity';
import { Type } from '../../entities/type.entity';
import { IMoveRepository } from '../../pokemon.repository.interface';

const NORMAL = new Type(1, 'ノーマル', 'Normal');

const moveOf = (id: number, name: string, category: MoveCategory): Move =>
  new Move(
    id,
    name,
    name,
    NORMAL,
    category,
    category === MoveCategory.Status ? null : 80,
    100,
    10,
    0,
    null,
  );

const statusOf = (id: number, volatileState: VolatileState = {}): BattlePokemonStatus =>
  new BattlePokemonStatus(id, 1, id, id, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null, volatileState);

const contextOf = (
  moves: Move[],
  defenderPendingMoveId?: number,
): BattleContext & { callMove: jest.Mock } => {
  const moveRepository: Pick<IMoveRepository, 'findById'> = {
    findById: (id: number) => Promise.resolve(moves.find(move => move.id === id) ?? null),
  };
  return {
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    moveRepository: moveRepository as IMoveRepository,
    callMove: jest.fn().mockResolvedValue('Used たいあたり and dealt 30 damage'),
    defenderPendingMoveId,
  };
};

describe('MeFirstEffect（さきどり）', () => {
  const effect = new MeFirstEffect();
  const attacker = statusOf(1);

  it('相手がまだ出していないダメージ技を、威力 1.5 倍で先に出す', async () => {
    // Arrange
    const tackle = moveOf(33, 'たいあたり', MoveCategory.Physical);
    const ctx = contextOf([tackle], 33);

    // Act
    const message = await effect.onUse(attacker, statusOf(2), ctx);

    // Assert
    expect(ctx.callMove).toHaveBeenCalledWith({
      moveId: 33,
      calledBy: 'さきどり',
      powerMultiplier: 1.5,
    });
    expect(message).toBe('Used たいあたり and dealt 30 damage');
  });

  it('相手がもう行動した（出す予定の技がない）ときは失敗する', () => {
    // Arrange
    const ctx = contextOf([]);

    // Act
    const fails = effect.shouldFail(attacker, statusOf(2), ctx);

    // Assert
    expect(fails).toBe(true);
  });

  it('相手が反動で動けないターンは失敗する', () => {
    // Arrange
    const ctx = contextOf([], 63);

    // Act
    const fails = effect.shouldFail(attacker, statusOf(2, { mustRecharge: true }), ctx);

    // Assert
    expect(fails).toBe(true);
  });

  it('相手がこれから技を出すなら、shouldFail では失敗しない', () => {
    // Arrange
    const ctx = contextOf([], 33);

    // Act
    const fails = effect.shouldFail(attacker, statusOf(2), ctx);

    // Assert
    expect(fails).toBe(false);
  });

  it('相手が出す予定の技が変化技なら失敗する', async () => {
    // Arrange
    const swordsDance = moveOf(14, 'つるぎのまい', MoveCategory.Status);
    const ctx = contextOf([swordsDance], 14);

    // Act
    const message = await effect.onUse(attacker, statusOf(2), ctx);

    // Assert
    expect(message).toBe('But it failed');
    expect(ctx.callMove).not.toHaveBeenCalled();
  });

  it('さきどりで出せない技（きあいパンチなど）なら失敗する', async () => {
    // Arrange
    const focusPunch = moveOf(264, 'きあいパンチ', MoveCategory.Physical);
    const ctx = contextOf([focusPunch], 264);

    // Act
    const message = await effect.onUse(attacker, statusOf(2), ctx);

    // Assert
    expect(message).toBe('But it failed');
    expect(ctx.callMove).not.toHaveBeenCalled();
  });
});
