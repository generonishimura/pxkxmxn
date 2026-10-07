import { BattleContext } from '../../abilities/battle-context.interface';
import { VolatileState } from '@/modules/battle/domain/state/volatile-state';
import { LaserFocusEffect } from './laser-focus-effect';
import { createBattleContext, createBattlePokemonStatus } from './__tests__/test-helpers';

describe('LaserFocusEffect', () => {
  const setup = (volatileState: VolatileState = {}, currentHp = 100) => {
    const attacker = createBattlePokemonStatus({ id: 1, volatileState, currentHp });
    const defender = createBattlePokemonStatus({ id: 2, trainerId: 2 });
    const patchVolatileState = jest.fn().mockResolvedValue(attacker);
    const ctx = createBattleContext({
      battleRepository: { patchVolatileState } as unknown as BattleContext['battleRepository'],
    });
    return { attacker, defender, patchVolatileState, ctx };
  };

  it('使ったターンと次のターンの技が必ず急所になる状態（laserFocusTurns: 2）にする', async () => {
    // Arrange
    const { attacker, defender, patchVolatileState, ctx } = setup();
    const effect = new LaserFocusEffect();

    // Act
    const message = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(patchVolatileState).toHaveBeenCalledWith(1, { laserFocusTurns: 2 });
    expect(message).toBe('concentrated intensely!');
  });

  it('とぎすましている間にもう一度使っても成功し、残りターンを 2 に書き直す', async () => {
    // Arrange
    const { attacker, defender, patchVolatileState, ctx } = setup({ laserFocusTurns: 1 });
    const effect = new LaserFocusEffect();

    // Act
    const message = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(patchVolatileState).toHaveBeenCalledWith(1, { laserFocusTurns: 2 });
    expect(message).toBe('concentrated intensely!');
  });

  it('ひんしのときは失敗する', async () => {
    // Arrange
    const { attacker, defender, patchVolatileState, ctx } = setup({}, 0);
    const effect = new LaserFocusEffect();

    // Act
    const message = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(patchVolatileState).not.toHaveBeenCalled();
    expect(message).toBe('But it failed');
  });
});
