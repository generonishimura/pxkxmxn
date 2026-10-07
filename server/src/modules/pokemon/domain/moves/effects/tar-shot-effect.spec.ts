import { TarShotEffect } from './tar-shot-effect';
import { createStatefulMoveContext, createStatus } from './__tests__/stateful-move-context';
import { AbilityRegistry } from '../../abilities/ability-registry';
import { VolatileState } from '@/modules/battle/domain/state/volatile-state';

describe('TarShotEffect（タールショット）', () => {
  beforeAll(() => {
    AbilityRegistry.initialize();
  });

  const setup = (defenderSeed: { speedRank?: number; volatileState?: VolatileState } = {}) => {
    const attacker = createStatus({ id: 1 });
    const defender = createStatus({ id: 2, ...defenderSeed });
    return {
      attacker,
      defender,
      ...createStatefulMoveContext({ attacker, defender, moveName: 'タールショット' }),
    };
  };

  it('相手の素早さを 1 段階下げ、ほのお技に弱くする', async () => {
    // Arrange
    const effect = new TarShotEffect();
    const { attacker, defender, ctx, latest } = setup();

    // Act
    const message = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(latest(2).speedRank).toBe(-1);
    expect(latest(2).volatileState.tarShot).toBe(true);
    expect(message).toBe('Speed fell! became weaker to fire!');
  });

  it('すでにタールショットを受けていても、素早さは下げる', async () => {
    // Arrange
    const effect = new TarShotEffect();
    const { attacker, defender, ctx, latest } = setup({ volatileState: { tarShot: true } });

    // Act
    const message = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(latest(2).speedRank).toBe(-1);
    expect(message).toBe('Speed fell!');
  });

  it('素早さが -6 でも、ほのお技に弱くはする', async () => {
    // Arrange
    const effect = new TarShotEffect();
    const { attacker, defender, ctx, latest } = setup({ speedRank: -6 });

    // Act
    const message = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(latest(2).volatileState.tarShot).toBe(true);
    expect(message).toBe('became weaker to fire!');
  });

  it('クリアボディで素早さが下がらなくても、ほのお技に弱くはする', async () => {
    // Arrange
    const effect = new TarShotEffect();
    const { attacker, defender, ctx, latest } = setup();
    ctx.defenderAbilityName = 'クリアボディ';

    // Act
    await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(latest(2).speedRank).toBe(0);
    expect(latest(2).volatileState.tarShot).toBe(true);
  });

  it('素早さが -6 で、すでにタールショットを受けていれば失敗する', async () => {
    // Arrange
    const effect = new TarShotEffect();
    const { attacker, defender, ctx } = setup({ speedRank: -6, volatileState: { tarShot: true } });

    // Act
    const message = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(message).toBe('But it failed');
  });
});
