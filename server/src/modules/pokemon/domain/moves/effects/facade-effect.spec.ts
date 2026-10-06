import { FacadeEffect } from './facade-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattleContext } from '../../abilities/battle-context.interface';

const createStatus = (id: number, statusCondition: StatusCondition | null): BattlePokemonStatus =>
  new BattlePokemonStatus(id, 1, id, id, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, statusCondition);

describe('FacadeEffect', () => {
  const defender = createStatus(2, null);
  const battleContext = { movePower: 70 } as BattleContext;

  describe('modifyMovePower', () => {
    it.each([
      StatusCondition.Burn,
      StatusCondition.Paralysis,
      StatusCondition.Poison,
      StatusCondition.BadPoison,
      StatusCondition.Freeze,
    ])('使用者が %s のとき威力が2倍（70 → 140）になる', status => {
      // Arrange
      const attacker = createStatus(1, status);

      // Act
      const power = new FacadeEffect().modifyMovePower(attacker, defender, battleContext);

      // Assert
      expect(power).toBe(140);
    });

    it('使用者がねむりのときは威力が変わらない', () => {
      // Arrange
      const attacker = createStatus(1, StatusCondition.Sleep);

      // Act
      const power = new FacadeEffect().modifyMovePower(attacker, defender, battleContext);

      // Assert
      expect(power).toBeUndefined();
    });

    it.each([null, StatusCondition.None, StatusCondition.Flinch, StatusCondition.Confusion])(
      '使用者が状態異常でない（%s）ときは威力が変わらない',
      status => {
        // Arrange
        const attacker = createStatus(1, status);

        // Act
        const power = new FacadeEffect().modifyMovePower(attacker, defender, battleContext);

        // Assert
        expect(power).toBeUndefined();
      },
    );

    it('相手が状態異常でも、使用者が状態異常でなければ威力が変わらない', () => {
      // Arrange
      const attacker = createStatus(1, null);
      const burnedDefender = createStatus(2, StatusCondition.Burn);

      // Act
      const power = new FacadeEffect().modifyMovePower(attacker, burnedDefender, battleContext);

      // Assert
      expect(power).toBeUndefined();
    });

    it('コンテキストに威力がないときは威力を変えない', () => {
      // Arrange
      const attacker = createStatus(1, StatusCondition.Burn);

      // Act
      const power = new FacadeEffect().modifyMovePower(attacker, defender, {} as BattleContext);

      // Assert
      expect(power).toBeUndefined();
    });
  });

  it('やけどによる物理技の半減を受けない', () => {
    // Act
    const effect = new FacadeEffect();

    // Assert
    expect(effect.ignoresBurnPenalty).toBe(true);
  });
});
