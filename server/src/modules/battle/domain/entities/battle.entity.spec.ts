import { Battle, Weather, Field, BattleStatus } from './battle.entity';
import { ValidationException } from '../../../../shared/domain/exceptions/validation.exception';

describe('Battle', () => {
  const createBattle = (
    overrides: Partial<{
      id: number;
      trainer1Id: number;
      trainer2Id: number;
      team1Id: number;
      team2Id: number;
      turn: number;
      weather: Weather | null;
      field: Field | null;
      status: BattleStatus;
      winnerTrainerId: number | null;
    }> = {},
  ): Battle => {
    return new Battle(
      overrides.id ?? 1,
      overrides.trainer1Id ?? 1,
      overrides.trainer2Id ?? 2,
      overrides.team1Id ?? 1,
      overrides.team2Id ?? 2,
      overrides.turn ?? 1,
      overrides.weather ?? null,
      overrides.field ?? null,
      overrides.status ?? BattleStatus.Active,
      overrides.winnerTrainerId ?? null,
    );
  };

  describe('バリデーション', () => {
    it('正常な値でBattleを作成できる', () => {
      const battle = createBattle();
      expect(battle).toBeInstanceOf(Battle);
    });

    it('IDが0以下の場合、ValidationExceptionを投げる', () => {
      expect(() => createBattle({ id: 0 })).toThrow(ValidationException);
      expect(() => createBattle({ id: -1 })).toThrow(ValidationException);
    });

    it('trainer1Idが0以下の場合、ValidationExceptionを投げる', () => {
      expect(() => createBattle({ trainer1Id: 0 })).toThrow(ValidationException);
      expect(() => createBattle({ trainer1Id: -1 })).toThrow(ValidationException);
    });

    it('trainer2Idが0以下の場合、ValidationExceptionを投げる', () => {
      expect(() => createBattle({ trainer2Id: 0 })).toThrow(ValidationException);
      expect(() => createBattle({ trainer2Id: -1 })).toThrow(ValidationException);
    });

    it('trainer1Idとtrainer2Idが同じ場合、ValidationExceptionを投げる', () => {
      expect(() => createBattle({ trainer1Id: 1, trainer2Id: 1 })).toThrow(
        ValidationException,
      );
    });

    it('team1Idが0以下の場合、ValidationExceptionを投げる', () => {
      expect(() => createBattle({ team1Id: 0 })).toThrow(ValidationException);
      expect(() => createBattle({ team1Id: -1 })).toThrow(ValidationException);
    });

    it('team2Idが0以下の場合、ValidationExceptionを投げる', () => {
      expect(() => createBattle({ team2Id: 0 })).toThrow(ValidationException);
      expect(() => createBattle({ team2Id: -1 })).toThrow(ValidationException);
    });

    it('team1Idとteam2Idが同じ場合、ValidationExceptionを投げる', () => {
      expect(() => createBattle({ team1Id: 1, team2Id: 1 })).toThrow(
        ValidationException,
      );
    });

    it('turnが0以下の場合、ValidationExceptionを投げる', () => {
      expect(() => createBattle({ turn: 0 })).toThrow(ValidationException);
      expect(() => createBattle({ turn: -1 })).toThrow(ValidationException);
    });

    it('winnerTrainerIdが0以下の場合、ValidationExceptionを投げる', () => {
      expect(() => createBattle({ winnerTrainerId: 0 })).toThrow(ValidationException);
      expect(() => createBattle({ winnerTrainerId: -1 })).toThrow(ValidationException);
    });

    it('winnerTrainerIdがnullの場合は正常', () => {
      const battle = createBattle({ winnerTrainerId: null });
      expect(battle.winnerTrainerId).toBeNull();
    });
  });
});

