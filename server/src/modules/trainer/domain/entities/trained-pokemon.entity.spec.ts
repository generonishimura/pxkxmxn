import { TrainedPokemon, Gender } from './trained-pokemon.entity';
import { Pokemon } from '@/modules/pokemon/domain/entities/pokemon.entity';
import { Type } from '@/modules/pokemon/domain/entities/type.entity';
import { Nature } from '@/modules/battle/domain/logic/stat-calculator';
import { ValidationException } from '@/shared/domain/exceptions';

describe('TrainedPokemon', () => {
  type StatPoints = {
    spHp: number;
    spAttack: number;
    spDefense: number;
    spSpecialAttack: number;
    spSpecialDefense: number;
    spSpeed: number;
  };

  const pokemon = new Pokemon(
    445,
    445,
    'ガブリアス',
    'Garchomp',
    new Type(1, 'ドラゴン', 'Dragon'),
    null,
    108,
    130,
    95,
    80,
    85,
    102,
  );

  const createTrainedPokemon = (
    overrides: Partial<StatPoints & { nature: Nature | null }> = {},
  ): TrainedPokemon => {
    const sp: StatPoints = {
      spHp: 0,
      spAttack: 0,
      spDefense: 0,
      spSpecialAttack: 0,
      spSpecialDefense: 0,
      spSpeed: 0,
      ...overrides,
    };
    return new TrainedPokemon(
      1,
      1,
      pokemon,
      null,
      Gender.Male,
      overrides.nature === undefined ? Nature.Jolly : overrides.nature,
      null,
      sp.spHp,
      sp.spAttack,
      sp.spDefense,
      sp.spSpecialAttack,
      sp.spSpecialDefense,
      sp.spSpeed,
    );
  };

  describe('レベル', () => {
    it('レベルは常に 50 になる', () => {
      // Act
      const trainedPokemon = createTrainedPokemon();

      // Assert
      expect(trainedPokemon.level).toBe(50);
    });
  });

  describe('能力ポイントのバリデーション', () => {
    it('1 つの能力に 32 まで振れる', () => {
      // Act
      const trainedPokemon = createTrainedPokemon({ spAttack: 32, spSpeed: 32, spHp: 2 });

      // Assert
      expect(trainedPokemon.spAttack).toBe(32);
      expect(trainedPokemon.spSpeed).toBe(32);
      expect(trainedPokemon.spHp).toBe(2);
    });

    it.each([
      'spHp',
      'spAttack',
      'spDefense',
      'spSpecialAttack',
      'spSpecialDefense',
      'spSpeed',
    ] as const)('%s が 33 なら ValidationException を投げる', field => {
      // Act & Assert
      expect(() => createTrainedPokemon({ [field]: 33 })).toThrow(
        new ValidationException(
          `Stat points for ${field} must be an integer between 0 and 32. Got: 33`,
          field,
        ),
      );
    });

    it('能力ポイントが負の数なら ValidationException を投げる', () => {
      // Act & Assert
      expect(() => createTrainedPokemon({ spDefense: -1 })).toThrow(ValidationException);
    });

    it('能力ポイントが整数でなければ ValidationException を投げる', () => {
      // Act & Assert
      expect(() => createTrainedPokemon({ spDefense: 1.5 })).toThrow(ValidationException);
    });

    it('合計がちょうど 66 なら作れる', () => {
      // Act
      const trainedPokemon = createTrainedPokemon({ spAttack: 32, spSpeed: 32, spHp: 2 });

      // Assert
      expect(trainedPokemon).toBeInstanceOf(TrainedPokemon);
    });

    it('合計が 67 なら ValidationException を投げる', () => {
      // Act & Assert
      expect(() => createTrainedPokemon({ spAttack: 32, spSpeed: 32, spHp: 3 })).toThrow(
        new ValidationException('Total stat points must not exceed 66. Got: 67', 'spTotal'),
      );
    });
  });

  describe('能力補正（性格）のバリデーション', () => {
    it.each([Nature.Hardy, Nature.Docile, Nature.Bashful, Nature.Quirky])(
      'チャンピオンズにない %s なら ValidationException を投げる',
      nature => {
        // Act & Assert
        expect(() => createTrainedPokemon({ nature })).toThrow(
          new ValidationException(
            `Nature ${nature} is not available in Champions. Use Serious for no stat change.`,
            'nature',
          ),
        );
      },
    );

    it('まじめ（Serious）は補正なしとして使える', () => {
      // Act
      const trainedPokemon = createTrainedPokemon({ nature: Nature.Serious });

      // Assert
      expect(trainedPokemon.nature).toBe(Nature.Serious);
    });

    it('性格が null なら補正なしとして作れる', () => {
      // Act
      const trainedPokemon = createTrainedPokemon({ nature: null });

      // Assert
      expect(trainedPokemon.nature).toBeNull();
    });

    it('補正のある性格は 20 種類すべて使える', () => {
      // Arrange
      const removed = [Nature.Hardy, Nature.Docile, Nature.Bashful, Nature.Quirky, Nature.Serious];
      const withModifier = Object.values(Nature).filter(nature => !removed.includes(nature));

      // Act & Assert
      expect(withModifier).toHaveLength(20);
      for (const nature of withModifier) {
        expect(() => createTrainedPokemon({ nature })).not.toThrow();
      }
    });
  });

  describe('技のバリデーション', () => {
    const createWithMoves = (moveIds?: readonly number[]): TrainedPokemon =>
      new TrainedPokemon(
        1,
        1,
        pokemon,
        null,
        Gender.Male,
        Nature.Jolly,
        null,
        0,
        0,
        0,
        0,
        0,
        0,
        null,
        moveIds,
      );

    it('技を渡さなければ、技は空になる', () => {
      // Act
      const trainedPokemon = createWithMoves();

      // Assert
      expect(trainedPokemon.moveIds).toEqual([]);
    });

    it('技を 4 つまで持てる（渡した順に並ぶ）', () => {
      // Act
      const trainedPokemon = createWithMoves([4, 1, 3, 2]);

      // Assert
      expect(trainedPokemon.moveIds).toEqual([4, 1, 3, 2]);
    });

    it('技が 5 つなら ValidationException を投げる', () => {
      // Act & Assert
      expect(() => createWithMoves([1, 2, 3, 4, 5])).toThrow(
        new ValidationException('A pokemon can have at most 4 moves. Got: 5', 'moveIds'),
      );
    });

    it('同じ技が 2 つあれば ValidationException を投げる', () => {
      // Act & Assert
      expect(() => createWithMoves([1, 2, 1])).toThrow(
        new ValidationException('A pokemon cannot have the same move twice: 1', 'moveIds'),
      );
    });

    it('渡した配列をあとから書き換えても、持っている技は変わらない', () => {
      // Arrange
      const moveIds = [1, 2];
      const trainedPokemon = createWithMoves(moveIds);

      // Act
      moveIds.push(3);

      // Assert
      expect(trainedPokemon.moveIds).toEqual([1, 2]);
    });
  });
});
