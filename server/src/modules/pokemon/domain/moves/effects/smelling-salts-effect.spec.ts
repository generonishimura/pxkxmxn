import { SmellingSaltsEffect } from './smelling-salts-effect';
import { createBattleContext, createBattlePokemonStatus } from './__tests__/test-helpers';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattleContext } from '../../abilities/battle-context.interface';

describe('SmellingSaltsEffect（きつけ）', () => {
  describe('威力（modifyMovePower）', () => {
    const attacker = createBattlePokemonStatus({ id: 1 });
    const battleContext = { ...createBattleContext(), movePower: 70 };

    it('相手がまひなら、威力が 2 倍になる', () => {
      // Arrange
      const effect = new SmellingSaltsEffect();
      const defender = createBattlePokemonStatus({
        id: 2,
        statusCondition: StatusCondition.Paralysis,
      });

      // Act
      const power = effect.modifyMovePower(attacker, defender, battleContext);

      // Assert
      expect(power).toBe(140);
    });

    it('相手がまひ以外（ねむり）なら、威力は変わらない', () => {
      // Arrange
      const effect = new SmellingSaltsEffect();
      const defender = createBattlePokemonStatus({ id: 2, statusCondition: StatusCondition.Sleep });

      // Act
      const power = effect.modifyMovePower(attacker, defender, battleContext);

      // Assert
      expect(power).toBeUndefined();
    });
  });

  describe('onHit', () => {
    it('まひの相手に当たると、まひを治す', async () => {
      // Arrange
      const effect = new SmellingSaltsEffect();
      const updateBattlePokemonStatus = jest.fn().mockResolvedValue(undefined);
      const ctx = createBattleContext({
        battleRepository: {
          updateBattlePokemonStatus,
        } as unknown as BattleContext['battleRepository'],
      });
      const defender = createBattlePokemonStatus({
        id: 2,
        statusCondition: StatusCondition.Paralysis,
      });

      // Act
      const message = await effect.onHit(createBattlePokemonStatus({ id: 1 }), defender, ctx);

      // Assert
      expect(message).toBe("target's paralysis was cured!");
      expect(updateBattlePokemonStatus).toHaveBeenCalledWith(2, {
        statusCondition: StatusCondition.None,
      });
    });
  });
});
