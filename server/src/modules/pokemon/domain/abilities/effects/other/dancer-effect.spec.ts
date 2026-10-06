import { DancerEffect } from './dancer-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { BattleContext } from '../../battle-context.interface';

const statusOf = (id: number): BattlePokemonStatus =>
  new BattlePokemonStatus(id, 1, id, id, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

const contextOf = (
  moveName: string | undefined,
  moveId: number | undefined,
): BattleContext & { callMove: jest.Mock } => ({
  battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
  moveName,
  moveId,
  callMove: jest.fn().mockResolvedValue("Used ちょうのまい 's Sp. Atk rose!"),
});

describe('DancerEffect（おどりこ）', () => {
  const effect = new DancerEffect();

  it('相手が出したおどり技を、技を出す前の判定をしてから自分も出す', async () => {
    // Arrange
    const ctx = contextOf('ちょうのまい', 483);

    // Act
    const message = await effect.onOpponentMoveUsed(statusOf(2), statusOf(1), ctx);

    // Assert
    expect(ctx.callMove).toHaveBeenCalledWith({
      moveId: 483,
      calledBy: 'おどりこ',
      runBeforeMoveChecks: true,
    });
    expect(message).toBe("Used ちょうのまい 's Sp. Atk rose!");
  });

  it.each(['つるぎのまい', 'フラフラダンス', 'めざめるダンス'])(
    'おどり技（%s）を出し直す',
    async moveName => {
      // Arrange
      const ctx = contextOf(moveName, 14);

      // Act
      await effect.onOpponentMoveUsed(statusOf(2), statusOf(1), ctx);

      // Assert
      expect(ctx.callMove).toHaveBeenCalledTimes(1);
    },
  );

  it('おどり技でなければ何もしない', async () => {
    // Arrange
    const ctx = contextOf('たいあたり', 33);

    // Act
    const message = await effect.onOpponentMoveUsed(statusOf(2), statusOf(1), ctx);

    // Assert
    expect(message).toBeNull();
    expect(ctx.callMove).not.toHaveBeenCalled();
  });

  it('コンテキストに技がなければ何もしない', async () => {
    // Arrange
    const ctx = contextOf(undefined, undefined);

    // Act
    const message = await effect.onOpponentMoveUsed(statusOf(2), statusOf(1), ctx);

    // Assert
    expect(message).toBeNull();
    expect(ctx.callMove).not.toHaveBeenCalled();
  });
});
