import { OctolockEffect } from './octolock-effect';
import { createStatefulMoveContext, createStatus } from './__tests__/stateful-move-context';
import { VolatileState } from '@/modules/battle/domain/state/volatile-state';

describe('OctolockEffect（たこがため）', () => {
  const setup = (defenderTypes: readonly string[], defenderState: VolatileState = {}) => {
    const attacker = createStatus({ id: 1 });
    const defender = createStatus({ id: 2, volatileState: defenderState });
    return {
      attacker,
      defender,
      ...createStatefulMoveContext({
        attacker,
        defender,
        typesById: { 2: defenderTypes },
        moveName: 'たこがため',
      }),
    };
  };

  it('相手に octolock と、逃げられなくした相手（使用者）を書く', async () => {
    // Arrange
    const effect = new OctolockEffect();
    const { attacker, defender, ctx, latest } = setup(['みず']);

    // Act
    const message = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(latest(2).volatileState.octolock).toBe(true);
    expect(latest(2).volatileState.trappedByStatusId).toBe(1);
    expect(message).toBe('can no longer escape because of Octolock!');
  });

  it('使ったターンには防御・特防を下げない（下げるのはターン終了時のエンジン）', async () => {
    // Arrange
    const effect = new OctolockEffect();
    const { attacker, defender, ctx, latest } = setup(['みず']);

    // Act
    await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(latest(2).defenseRank).toBe(0);
    expect(latest(2).specialDefenseRank).toBe(0);
  });

  it('ゴーストタイプには効かない', async () => {
    // Arrange
    const effect = new OctolockEffect();
    const { attacker, defender, ctx, latest } = setup(['どく', 'ゴースト']);

    // Act
    const message = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(latest(2).volatileState.octolock).toBeUndefined();
    expect(latest(2).volatileState.trappedByStatusId).toBeUndefined();
    expect(message).toBe('but it had no effect');
  });

  it('すでにたこがためを受けていれば失敗する', async () => {
    // Arrange
    const effect = new OctolockEffect();
    const { attacker, defender, ctx } = setup(['みず'], { octolock: true, trappedByStatusId: 1 });

    // Act
    const message = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(message).toBe('But it failed');
  });
});
