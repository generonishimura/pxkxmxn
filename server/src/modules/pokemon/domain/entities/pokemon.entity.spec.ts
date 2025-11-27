import { Pokemon } from './pokemon.entity';
import { Type } from './type.entity';
import { ValidationException } from '../../../../shared/domain/exceptions/validation.exception';

describe('Pokemon', () => {
  const createType = (id: number = 1, name: string = 'ノーマル', nameEn: string = 'Normal'): Type => {
    return new Type(id, name, nameEn);
  };

  const createPokemon = (
    overrides: Partial<{
      id: number;
      nationalDex: number;
      name: string;
      nameEn: string;
      primaryType: Type;
      secondaryType: Type | null;
      baseHp: number;
      baseAttack: number;
      baseDefense: number;
      baseSpecialAttack: number;
      baseSpecialDefense: number;
      baseSpeed: number;
    }> = {},
  ): Pokemon => {
    return new Pokemon(
      overrides.id ?? 1,
      overrides.nationalDex ?? 1,
      overrides.name ?? 'テストポケモン',
      overrides.nameEn ?? 'TestPokemon',
      overrides.primaryType ?? createType(),
      overrides.secondaryType ?? null,
      overrides.baseHp ?? 100,
      overrides.baseAttack ?? 100,
      overrides.baseDefense ?? 100,
      overrides.baseSpecialAttack ?? 100,
      overrides.baseSpecialDefense ?? 100,
      overrides.baseSpeed ?? 100,
    );
  };

  describe('バリデーション', () => {
    it('正常な値でPokemonを作成できる', () => {
      const pokemon = createPokemon();
      expect(pokemon).toBeInstanceOf(Pokemon);
    });

    it('IDが0以下の場合、ValidationExceptionを投げる', () => {
      expect(() => createPokemon({ id: 0 })).toThrow(ValidationException);
      expect(() => createPokemon({ id: -1 })).toThrow(ValidationException);
    });

    it('nationalDexが0以下の場合、ValidationExceptionを投げる', () => {
      expect(() => createPokemon({ nationalDex: 0 })).toThrow(ValidationException);
      expect(() => createPokemon({ nationalDex: -1 })).toThrow(ValidationException);
    });

    it('nameが空文字列の場合、ValidationExceptionを投げる', () => {
      expect(() => createPokemon({ name: '' })).toThrow(ValidationException);
      expect(() => createPokemon({ name: '   ' })).toThrow(ValidationException);
    });

    it('nameEnが空文字列の場合、ValidationExceptionを投げる', () => {
      expect(() => createPokemon({ nameEn: '' })).toThrow(ValidationException);
      expect(() => createPokemon({ nameEn: '   ' })).toThrow(ValidationException);
    });

    it('基本ステータスが1未満の場合、ValidationExceptionを投げる', () => {
      expect(() => createPokemon({ baseHp: 0 })).toThrow(ValidationException);
      expect(() => createPokemon({ baseAttack: 0 })).toThrow(ValidationException);
    });

    it('基本ステータスが255超過の場合、ValidationExceptionを投げる', () => {
      expect(() => createPokemon({ baseHp: 256 })).toThrow(ValidationException);
      expect(() => createPokemon({ baseAttack: 256 })).toThrow(ValidationException);
    });

    it('すべての基本ステータスが1-255の範囲内の場合、正常に作成できる', () => {
      const pokemon = createPokemon({
        baseHp: 1,
        baseAttack: 255,
        baseDefense: 100,
        baseSpecialAttack: 50,
        baseSpecialDefense: 200,
        baseSpeed: 150,
      });
      expect(pokemon).toBeInstanceOf(Pokemon);
    });
  });
});

