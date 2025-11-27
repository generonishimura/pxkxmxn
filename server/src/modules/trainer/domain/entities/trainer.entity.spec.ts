import { Trainer } from './trainer.entity';
import { ValidationException } from '../../../../shared/domain/exceptions/validation.exception';

describe('Trainer', () => {
  const createTrainer = (
    overrides: Partial<{
      id: number;
      name: string;
      email: string | null;
      createdAt: Date;
      updatedAt: Date;
    }> = {},
  ): Trainer => {
    const now = new Date();
    return new Trainer(
      overrides.id ?? 1,
      overrides.name ?? 'テストトレーナー',
      overrides.email ?? null,
      overrides.createdAt ?? now,
      overrides.updatedAt ?? now,
    );
  };

  describe('バリデーション', () => {
    it('正常な値でTrainerを作成できる', () => {
      const trainer = createTrainer();
      expect(trainer).toBeInstanceOf(Trainer);
    });

    it('IDが0以下の場合、ValidationExceptionを投げる', () => {
      expect(() => createTrainer({ id: 0 })).toThrow(ValidationException);
      expect(() => createTrainer({ id: -1 })).toThrow(ValidationException);
    });

    it('nameが空文字列の場合、ValidationExceptionを投げる', () => {
      expect(() => createTrainer({ name: '' })).toThrow(ValidationException);
      expect(() => createTrainer({ name: '   ' })).toThrow(ValidationException);
    });

    it('nameが1文字未満の場合、ValidationExceptionを投げる', () => {
      expect(() => createTrainer({ name: '' })).toThrow(ValidationException);
    });

    it('nameが50文字超過の場合、ValidationExceptionを投げる', () => {
      const longName = 'a'.repeat(51);
      expect(() => createTrainer({ name: longName })).toThrow(ValidationException);
    });

    it('nameが1-50文字の範囲内の場合、正常に作成できる', () => {
      const trainer1 = createTrainer({ name: 'a' });
      expect(trainer1).toBeInstanceOf(Trainer);

      const trainer2 = createTrainer({ name: 'a'.repeat(50) });
      expect(trainer2).toBeInstanceOf(Trainer);
    });

    it('createdAtが無効なDateの場合、ValidationExceptionを投げる', () => {
      expect(() => createTrainer({ createdAt: new Date('invalid') })).toThrow(ValidationException);
    });

    it('updatedAtが無効なDateの場合、ValidationExceptionを投げる', () => {
      expect(() => createTrainer({ updatedAt: new Date('invalid') })).toThrow(ValidationException);
    });

    it('emailがnullの場合は正常', () => {
      const trainer = createTrainer({ email: null });
      expect(trainer.email).toBeNull();
    });
  });
});
