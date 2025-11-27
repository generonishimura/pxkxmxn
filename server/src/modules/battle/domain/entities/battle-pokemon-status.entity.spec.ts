import { BattlePokemonStatus } from './battle-pokemon-status.entity';
import { StatusCondition } from './status-condition.enum';
import { ValidationException } from '../../../../shared/domain/exceptions/validation.exception';

describe('BattlePokemonStatus', () => {
  const createBattlePokemonStatus = (
    overrides: Partial<{
      id: number;
      battleId: number;
      trainedPokemonId: number;
      trainerId: number;
      isActive: boolean;
      currentHp: number;
      maxHp: number;
      attackRank: number;
      defenseRank: number;
      specialAttackRank: number;
      specialDefenseRank: number;
      speedRank: number;
      accuracyRank: number;
      evasionRank: number;
      statusCondition: StatusCondition | null;
    }> = {},
  ): BattlePokemonStatus => {
    return new BattlePokemonStatus(
      overrides.id ?? 1,
      overrides.battleId ?? 1,
      overrides.trainedPokemonId ?? 1,
      overrides.trainerId ?? 1,
      overrides.isActive ?? true,
      overrides.currentHp ?? 100,
      overrides.maxHp ?? 100,
      overrides.attackRank ?? 0,
      overrides.defenseRank ?? 0,
      overrides.specialAttackRank ?? 0,
      overrides.specialDefenseRank ?? 0,
      overrides.speedRank ?? 0,
      overrides.accuracyRank ?? 0,
      overrides.evasionRank ?? 0,
      overrides.statusCondition ?? null,
    );
  };

  describe('バリデーション', () => {
    it('正常な値でBattlePokemonStatusを作成できる', () => {
      const status = createBattlePokemonStatus();
      expect(status).toBeInstanceOf(BattlePokemonStatus);
    });

    it('IDが0以下の場合、ValidationExceptionを投げる', () => {
      expect(() => createBattlePokemonStatus({ id: 0 })).toThrow(ValidationException);
      expect(() => createBattlePokemonStatus({ id: -1 })).toThrow(ValidationException);
    });

    it('maxHpが0以下の場合、ValidationExceptionを投げる', () => {
      expect(() => createBattlePokemonStatus({ maxHp: 0 })).toThrow(ValidationException);
      expect(() => createBattlePokemonStatus({ maxHp: -1 })).toThrow(ValidationException);
    });

    it('currentHpが負の値の場合、ValidationExceptionを投げる', () => {
      expect(() => createBattlePokemonStatus({ currentHp: -1 })).toThrow(
        ValidationException,
      );
    });

    it('currentHpがmaxHpを超える場合、ValidationExceptionを投げる', () => {
      expect(() => createBattlePokemonStatus({ currentHp: 101, maxHp: 100 })).toThrow(
        ValidationException,
      );
    });

    it('ランクが-6未満の場合、ValidationExceptionを投げる', () => {
      expect(() => createBattlePokemonStatus({ attackRank: -7 })).toThrow(
        ValidationException,
      );
    });

    it('ランクが+6超過の場合、ValidationExceptionを投げる', () => {
      expect(() => createBattlePokemonStatus({ attackRank: 7 })).toThrow(
        ValidationException,
      );
    });

    it('すべてのランクが-6から+6の範囲内の場合、正常に作成できる', () => {
      const status = createBattlePokemonStatus({
        attackRank: -6,
        defenseRank: 0,
        specialAttackRank: 6,
        specialDefenseRank: 3,
        speedRank: -3,
        accuracyRank: 1,
        evasionRank: -1,
      });
      expect(status).toBeInstanceOf(BattlePokemonStatus);
    });
  });

  describe('isFainted', () => {
    it('HPが0以下の場合はtrueを返す', () => {
      const status = createBattlePokemonStatus({ currentHp: 0, maxHp: 100 });
      expect(status.isFainted()).toBe(true);
    });

    it('HPが1以上の場合はfalseを返す', () => {
      const status = createBattlePokemonStatus({ currentHp: 1, maxHp: 100 });
      expect(status.isFainted()).toBe(false);
    });
  });
});

