import { Ability, AbilityTrigger, AbilityCategory } from './ability.entity';
import { ValidationException } from '../../../../shared/domain/exceptions/validation.exception';

describe('Ability', () => {
  const createAbility = (
    overrides: Partial<{
      id: number;
      name: string;
      nameEn: string;
      description: string;
      triggerEvent: AbilityTrigger;
      effectCategory: AbilityCategory;
    }> = {},
  ): Ability => {
    return new Ability(
      overrides.id ?? 1,
      overrides.name ?? 'テスト特性',
      overrides.nameEn ?? 'TestAbility',
      overrides.description ?? 'テスト用の特性です',
      overrides.triggerEvent ?? AbilityTrigger.Passive,
      overrides.effectCategory ?? AbilityCategory.Other,
    );
  };

  describe('バリデーション', () => {
    it('正常な値でAbilityを作成できる', () => {
      const ability = createAbility();
      expect(ability).toBeInstanceOf(Ability);
    });

    it('IDが0以下の場合、ValidationExceptionを投げる', () => {
      expect(() => createAbility({ id: 0 })).toThrow(ValidationException);
      expect(() => createAbility({ id: -1 })).toThrow(ValidationException);
    });

    it('nameが空文字列の場合、ValidationExceptionを投げる', () => {
      expect(() => createAbility({ name: '' })).toThrow(ValidationException);
      expect(() => createAbility({ name: '   ' })).toThrow(ValidationException);
    });

    it('nameEnが空文字列の場合、ValidationExceptionを投げる', () => {
      expect(() => createAbility({ nameEn: '' })).toThrow(ValidationException);
      expect(() => createAbility({ nameEn: '   ' })).toThrow(ValidationException);
    });

    it('descriptionが空文字列の場合、ValidationExceptionを投げる', () => {
      expect(() => createAbility({ description: '' })).toThrow(ValidationException);
      expect(() => createAbility({ description: '   ' })).toThrow(ValidationException);
    });
  });
});

