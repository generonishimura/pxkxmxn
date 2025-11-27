import { Move, MoveCategory } from './move.entity';
import { Type } from './type.entity';
import { ValidationException } from '../../../../shared/domain/exceptions/validation.exception';

describe('Move', () => {
  const createType = (id: number = 1, name: string = 'ノーマル', nameEn: string = 'Normal'): Type => {
    return new Type(id, name, nameEn);
  };

  const createMove = (
    overrides: Partial<{
      id: number;
      name: string;
      nameEn: string;
      type: Type;
      category: MoveCategory;
      power: number | null;
      accuracy: number | null;
      pp: number;
      priority: number;
      description: string | null;
    }> = {},
  ): Move => {
    return new Move(
      overrides.id ?? 1,
      overrides.name ?? 'テスト技',
      overrides.nameEn ?? 'TestMove',
      overrides.type ?? createType(),
      overrides.category ?? MoveCategory.Physical,
      overrides.power !== undefined ? overrides.power : 100,
      overrides.accuracy !== undefined ? overrides.accuracy : 100,
      overrides.pp ?? 10,
      overrides.priority ?? 0,
      overrides.description ?? null,
    );
  };

  describe('バリデーション', () => {
    it('正常な値でMoveを作成できる', () => {
      const move = createMove();
      expect(move).toBeInstanceOf(Move);
    });

    it('IDが0以下の場合、ValidationExceptionを投げる', () => {
      expect(() => createMove({ id: 0 })).toThrow(ValidationException);
      expect(() => createMove({ id: -1 })).toThrow(ValidationException);
    });

    it('nameが空文字列の場合、ValidationExceptionを投げる', () => {
      expect(() => createMove({ name: '' })).toThrow(ValidationException);
      expect(() => createMove({ name: '   ' })).toThrow(ValidationException);
    });

    it('nameEnが空文字列の場合、ValidationExceptionを投げる', () => {
      expect(() => createMove({ nameEn: '' })).toThrow(ValidationException);
      expect(() => createMove({ nameEn: '   ' })).toThrow(ValidationException);
    });

    it('powerが1未満の場合、ValidationExceptionを投げる', () => {
      expect(() => createMove({ power: 0 })).toThrow(ValidationException);
      expect(() => createMove({ power: -1 })).toThrow(ValidationException);
    });

    it('powerが300超過の場合、ValidationExceptionを投げる', () => {
      expect(() => createMove({ power: 301 })).toThrow(ValidationException);
    });

    it('powerがnullの場合は正常（変化技）', () => {
      const move = createMove({ power: null, category: MoveCategory.Status });
      expect(move.power).toBeNull();
    });

    it('accuracyが1未満の場合、ValidationExceptionを投げる', () => {
      expect(() => createMove({ accuracy: 0 })).toThrow(ValidationException);
      expect(() => createMove({ accuracy: -1 })).toThrow(ValidationException);
    });

    it('accuracyが100超過の場合、ValidationExceptionを投げる', () => {
      expect(() => createMove({ accuracy: 101 })).toThrow(ValidationException);
    });

    it('accuracyがnullの場合は正常（必中技）', () => {
      const move = createMove({ accuracy: null });
      expect(move.accuracy).toBeNull();
    });

    it('ppが1未満の場合、ValidationExceptionを投げる', () => {
      expect(() => createMove({ pp: 0 })).toThrow(ValidationException);
      expect(() => createMove({ pp: -1 })).toThrow(ValidationException);
    });

    it('ppが40超過の場合、ValidationExceptionを投げる', () => {
      expect(() => createMove({ pp: 41 })).toThrow(ValidationException);
    });

    it('priorityが-7未満の場合、ValidationExceptionを投げる', () => {
      expect(() => createMove({ priority: -8 })).toThrow(ValidationException);
    });

    it('priorityが5超過の場合、ValidationExceptionを投げる', () => {
      expect(() => createMove({ priority: 6 })).toThrow(ValidationException);
    });

    it('すべての値が有効な範囲内の場合、正常に作成できる', () => {
      const move = createMove({
        power: 1,
        accuracy: 1,
        pp: 1,
        priority: -7,
      });
      expect(move).toBeInstanceOf(Move);
    });

    it('最大値でも正常に作成できる', () => {
      const move = createMove({
        power: 300,
        accuracy: 100,
        pp: 40,
        priority: 5,
      });
      expect(move).toBeInstanceOf(Move);
    });
  });
});

