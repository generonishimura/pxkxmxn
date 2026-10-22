import { MoveFlags, isContactMove } from './move-flags';
import { BattleContext } from '../abilities/battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('MoveFlags', () => {
  const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);

  describe('get', () => {
    it('パンチ技はcontactとpunchのフラグを持つ', () => {
      // Arrange
      const moveName = 'ほのおのパンチ';

      // Act
      const flags = MoveFlags.get(moveName);

      // Assert
      expect(flags.has('contact')).toBe(true);
      expect(flags.has('punch')).toBe(true);
      expect(flags.has('sound')).toBe(false);
    });

    it('全角英字を含む技名もそのまま引ける', () => {
      // Arrange
      const moveName = 'ＤＤラリアット';

      // Act
      const flags = MoveFlags.get(moveName);

      // Assert
      expect(flags.has('contact')).toBe(true);
    });

    it('表にない技はフラグを持たない', () => {
      // Arrange
      const moveName = 'じしん';

      // Act
      const flags = MoveFlags.get(moveName);

      // Assert
      expect(flags.size).toBe(0);
    });
  });

  describe('has', () => {
    it('音技はsoundフラグを持つ', () => {
      // Arrange & Act
      const result = MoveFlags.has('ハイパーボイス', 'sound');

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('targetsOpponent', () => {
    it('相手を対象にする技はtrueを返す', () => {
      // Arrange & Act
      const result = MoveFlags.targetsOpponent('なきごえ');

      // Assert
      expect(result).toBe(true);
    });

    it('自分を対象にする技はfalseを返す', () => {
      // Arrange & Act
      const result = MoveFlags.targetsOpponent('とおぼえ');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('isContactMove', () => {
    it('moveFlagsがある場合はcontactフラグで判定する', () => {
      // Arrange
      const context: BattleContext = {
        battle,
        moveCategory: 'Physical',
        moveFlags: new Set(),
      };

      // Act
      const result = isContactMove(context);

      // Assert
      expect(result).toBe(false);
    });

    it('moveFlagsがない場合は物理技を接触技とみなす', () => {
      // Arrange
      const context: BattleContext = { battle, moveCategory: 'Physical' };

      // Act
      const result = isContactMove(context);

      // Assert
      expect(result).toBe(true);
    });

    it('コンテキストがない場合は接触技ではない', () => {
      // Arrange & Act
      const result = isContactMove(undefined);

      // Assert
      expect(result).toBe(false);
    });
  });
});
