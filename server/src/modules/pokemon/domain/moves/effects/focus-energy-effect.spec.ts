import { BattleContext } from '../../abilities/battle-context.interface';
import { FOCUS_ENERGY_CRIT_STAGE_BOOST } from '@/modules/battle/domain/logic/critical-hit';
import { VolatileState } from '@/modules/battle/domain/state/volatile-state';
import { FocusEnergyEffect } from './focus-energy-effect';
import { createBattleContext, createBattlePokemonStatus } from './__tests__/test-helpers';

describe('FocusEnergyEffect', () => {
  const setup = (volatileState: VolatileState = {}) => {
    const attacker = createBattlePokemonStatus({ id: 1, volatileState });
    const defender = createBattlePokemonStatus({ id: 2, trainerId: 2 });
    const patchVolatileState = jest.fn().mockResolvedValue(attacker);
    const ctx = createBattleContext({
      battleRepository: { patchVolatileState } as unknown as BattleContext['battleRepository'],
    });
    return { attacker, defender, patchVolatileState, ctx };
  };

  it('使用者の急所ランクを 2 上げる（critStageBoost: 2 を書き込む）', async () => {
    // Arrange
    const { attacker, defender, patchVolatileState, ctx } = setup();
    const effect = new FocusEnergyEffect();

    // Act
    const message = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(FOCUS_ENERGY_CRIT_STAGE_BOOST).toBe(2);
    expect(patchVolatileState).toHaveBeenCalledWith(1, {
      critStageBoost: FOCUS_ENERGY_CRIT_STAGE_BOOST,
    });
    expect(message).toBe('is getting pumped!');
  });

  it('すでにきあいだめしていたら失敗する', async () => {
    // Arrange
    const { attacker, defender, patchVolatileState, ctx } = setup({ critStageBoost: 2 });
    const effect = new FocusEnergyEffect();

    // Act
    const message = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(patchVolatileState).not.toHaveBeenCalled();
    expect(message).toBe('But it failed');
  });
});
