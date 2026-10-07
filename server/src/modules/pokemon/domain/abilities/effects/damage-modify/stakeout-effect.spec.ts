import { StakeoutEffect } from './stakeout-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { BattleContext } from '../../battle-context.interface';

describe('StakeoutEffect（はりこみ）', () => {
  const attacker = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const createContext = (
    turn: number,
    switchedInTurn: number | undefined,
    moveName = 'たいあたり',
  ): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, turn, null, null, BattleStatus.Active, null),
    moveName,
    defender: new BattlePokemonStatus(
      2,
      1,
      2,
      2,
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
      null,
      switchedInTurn === undefined ? {} : { switchedInTurn },
    ),
  });

  describe('modifyBasePower', () => {
    it('相手がこのターンに交代で出てきたとき、威力を2倍にする', () => {
      // Arrange
      const battleContext = createContext(3, 3);

      // Act
      const result = new StakeoutEffect().modifyBasePower(attacker, 80, battleContext);

      // Assert
      expect(result).toBe(160);
    });

    it('相手が前のターンに出てきたときは、威力を変えない', () => {
      // Arrange
      const battleContext = createContext(3, 2);

      // Act
      const result = new StakeoutEffect().modifyBasePower(attacker, 80, battleContext);

      // Assert
      expect(result).toBeUndefined();
    });

    it('先発の相手（バトル開始時に出た）には、1ターン目でも威力を変えない', () => {
      // Arrange
      const battleContext = createContext(1, 0);

      // Act
      const result = new StakeoutEffect().modifyBasePower(attacker, 80, battleContext);

      // Assert
      expect(result).toBeUndefined();
    });

    it('相手の出たターンが分からないときは、威力を変えない', () => {
      // Arrange
      const battleContext = createContext(3, undefined);

      // Act
      const result = new StakeoutEffect().modifyBasePower(attacker, 80, battleContext);

      // Assert
      expect(result).toBeUndefined();
    });

    it('ボディプレスは攻撃ではなく防御で計算するので、威力を変えない', () => {
      // Arrange
      const battleContext = createContext(3, 3, 'ボディプレス');

      // Act
      const result = new StakeoutEffect().modifyBasePower(attacker, 80, battleContext);

      // Assert
      expect(result).toBeUndefined();
    });
  });
});
