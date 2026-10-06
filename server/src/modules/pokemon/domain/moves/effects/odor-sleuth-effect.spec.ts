import { OdorSleuthEffect } from './odor-sleuth-effect';
import { MiracleEyeEffect } from './miracle-eye-effect';
import { createStatefulMoveContext, createStatus } from './__tests__/stateful-move-context';
import { VolatileState } from '@/modules/battle/domain/state/volatile-state';

describe('相手をみやぶる技', () => {
  const setup = (defenderState: VolatileState = {}) => {
    const attacker = createStatus({ id: 1 });
    const defender = createStatus({ id: 2, volatileState: defenderState });
    return { attacker, defender, ...createStatefulMoveContext({ attacker, defender }) };
  };

  describe('OdorSleuthEffect（かぎわける）', () => {
    it('相手を foresight の状態にする', async () => {
      // Arrange
      const effect = new OdorSleuthEffect();
      const { attacker, defender, ctx, latest } = setup();

      // Act
      const message = await effect.onUse(attacker, defender, ctx);

      // Assert
      expect(latest(2).volatileState.foresight).toBe(true);
      expect(message).toBe('was identified!');
    });

    it('相手がすでに foresight の状態なら失敗する', async () => {
      // Arrange
      const effect = new OdorSleuthEffect();
      const { attacker, defender, ctx } = setup({ foresight: true });

      // Act
      const message = await effect.onUse(attacker, defender, ctx);

      // Assert
      expect(message).toBe('But it failed');
    });

    it('相手がミラクルアイを受けていると失敗する', () => {
      // Arrange
      const effect = new OdorSleuthEffect();
      const { attacker, defender } = setup({ miracleEye: true });

      // Act
      const failed = effect.shouldFail(attacker, defender);

      // Assert
      expect(failed).toBe(true);
    });

    it('相手が何も受けていなければ失敗しない', () => {
      // Arrange
      const effect = new OdorSleuthEffect();
      const { attacker, defender } = setup();

      // Act
      const failed = effect.shouldFail(attacker, defender);

      // Assert
      expect(failed).toBe(false);
    });
  });

  describe('MiracleEyeEffect（ミラクルアイ）', () => {
    it('相手を miracleEye の状態にする', async () => {
      // Arrange
      const effect = new MiracleEyeEffect();
      const { attacker, defender, ctx, latest } = setup();

      // Act
      const message = await effect.onUse(attacker, defender, ctx);

      // Assert
      expect(latest(2).volatileState.miracleEye).toBe(true);
      expect(message).toBe('was identified!');
    });

    it('相手がすでに miracleEye の状態なら失敗する', async () => {
      // Arrange
      const effect = new MiracleEyeEffect();
      const { attacker, defender, ctx } = setup({ miracleEye: true });

      // Act
      const message = await effect.onUse(attacker, defender, ctx);

      // Assert
      expect(message).toBe('But it failed');
    });

    it('相手がみやぶる・かぎわけるを受けていると失敗する', () => {
      // Arrange
      const effect = new MiracleEyeEffect();
      const { attacker, defender } = setup({ foresight: true });

      // Act
      const failed = effect.shouldFail(attacker, defender);

      // Assert
      expect(failed).toBe(true);
    });
  });
});
