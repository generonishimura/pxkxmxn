import { BattlePokemonMove } from './battle-pokemon-move.entity';
import { ValidationException } from '../../../../shared/domain/exceptions/validation.exception';

describe('BattlePokemonMove', () => {
  const createBattlePokemonMove = (
    overrides: Partial<{
      id: number;
      battlePokemonStatusId: number;
      moveId: number;
      currentPp: number;
      maxPp: number;
    }> = {},
  ): BattlePokemonMove => {
    return new BattlePokemonMove(
      overrides.id ?? 1,
      overrides.battlePokemonStatusId ?? 1,
      overrides.moveId ?? 1,
      overrides.currentPp ?? 10,
      overrides.maxPp ?? 10,
    );
  };

  describe('バリデーション', () => {
    it('正常な値でBattlePokemonMoveを作成できる', () => {
      const move = createBattlePokemonMove();
      expect(move).toBeInstanceOf(BattlePokemonMove);
    });

    it('IDが0以下の場合、ValidationExceptionを投げる', () => {
      expect(() => createBattlePokemonMove({ id: 0 })).toThrow(ValidationException);
      expect(() => createBattlePokemonMove({ id: -1 })).toThrow(ValidationException);
    });

    it('maxPpが負の値の場合、ValidationExceptionを投げる', () => {
      expect(() => createBattlePokemonMove({ maxPp: -1 })).toThrow(ValidationException);
    });

    it('currentPpが負の値の場合、ValidationExceptionを投げる', () => {
      expect(() => createBattlePokemonMove({ currentPp: -1 })).toThrow(
        ValidationException,
      );
    });

    it('currentPpがmaxPpを超える場合、ValidationExceptionを投げる', () => {
      expect(() => createBattlePokemonMove({ currentPp: 11, maxPp: 10 })).toThrow(
        ValidationException,
      );
    });
  });

  describe('isPpExhausted', () => {
    it('PPが0の場合はtrueを返す', () => {
      const move = createBattlePokemonMove({ currentPp: 0, maxPp: 10 });
      expect(move.isPpExhausted()).toBe(true);
    });

    it('PPが1以上の場合はfalseを返す', () => {
      const move = createBattlePokemonMove({ currentPp: 1, maxPp: 10 });
      expect(move.isPpExhausted()).toBe(false);
    });

    it('PPが最大値の場合はfalseを返す', () => {
      const move = createBattlePokemonMove({ currentPp: 10, maxPp: 10 });
      expect(move.isPpExhausted()).toBe(false);
    });
  });

  describe('consumePp', () => {
    it('PPを1消費する（デフォルト）', () => {
      const move = createBattlePokemonMove({ currentPp: 10, maxPp: 10 });
      const newPp = move.consumePp();
      expect(newPp).toBe(9);
    });

    it('PPを指定した量だけ消費する', () => {
      const move = createBattlePokemonMove({ currentPp: 10, maxPp: 10 });
      const newPp = move.consumePp(3);
      expect(newPp).toBe(7);
    });

    it('PPが0未満にならない', () => {
      const move = createBattlePokemonMove({ currentPp: 1, maxPp: 10 });
      const newPp = move.consumePp(5);
      expect(newPp).toBe(0);
    });

    it('PPが0の場合、消費しても0のまま', () => {
      const move = createBattlePokemonMove({ currentPp: 0, maxPp: 10 });
      const newPp = move.consumePp();
      expect(newPp).toBe(0);
    });

    it('元のエンティティのPPは変更されない（イミュータブル）', () => {
      const move = createBattlePokemonMove({ currentPp: 10, maxPp: 10 });
      move.consumePp();
      expect(move.currentPp).toBe(10); // 元の値は変更されない
    });
  });
});
