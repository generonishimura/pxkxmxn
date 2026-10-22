import { RivalryEffect } from './rivalry-effect';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';
import { Gender, TrainedPokemon } from '@/modules/trainer/domain/entities/trained-pokemon.entity';
import { Pokemon } from '@/modules/pokemon/domain/entities/pokemon.entity';
import { Type } from '@/modules/pokemon/domain/entities/type.entity';
import { Nature } from '@/modules/battle/domain/logic/stat-calculator';

describe('RivalryEffect（とうそうしん）', () => {
  const createTrainedPokemon = (id: number, gender: Gender | null): TrainedPokemon =>
    new TrainedPokemon(
      id,
      id,
      new Pokemon(
        id,
        id,
        'テスト',
        'Test',
        new Type(1, 'ノーマル', 'Normal'),
        null,
        100,
        100,
        100,
        100,
        100,
        100,
      ),
      null,
      50,
      gender,
      Nature.Hardy,
      null,
      31,
      31,
      31,
      31,
      31,
      31,
      0,
      0,
      0,
      0,
      0,
      0,
    );

  /**
   * 攻撃側（ID 1）と防御側（ID 2）の性別を決めたバトルを作る
   */
  const setUp = (attackerGender: Gender | null, defenderGender: Gender | null) => {
    const { context, get, trainedPokemonRepository } = createInMemoryBattle({
      ability: 'とうそうしん',
    });
    const trainedPokemons = new Map<number, TrainedPokemon>([
      [1, createTrainedPokemon(1, attackerGender)],
      [2, createTrainedPokemon(2, defenderGender)],
    ]);
    trainedPokemonRepository.findById.mockImplementation((id: number) =>
      Promise.resolve(trainedPokemons.get(id) ?? null),
    );
    return {
      attacker: get(1),
      battleContext: context({ attacker: get(1), defender: get(2) }),
    };
  };

  describe('modifyDamageDealt', () => {
    it('相手と同じ性別なら、ダメージを1.25倍にする', async () => {
      // Arrange
      const { attacker, battleContext } = setUp(Gender.Male, Gender.Male);

      // Act
      const result = await new RivalryEffect().modifyDamageDealt(attacker, 100, battleContext);

      // Assert
      expect(result).toBe(125);
    });

    it('相手と違う性別なら、ダメージを0.75倍にする', async () => {
      // Arrange
      const { attacker, battleContext } = setUp(Gender.Female, Gender.Male);

      // Act
      const result = await new RivalryEffect().modifyDamageDealt(attacker, 100, battleContext);

      // Assert
      expect(result).toBe(75);
    });

    it('相手が性別不明なら、ダメージを変えない', async () => {
      // Arrange
      const { attacker, battleContext } = setUp(Gender.Male, Gender.Genderless);

      // Act
      const result = await new RivalryEffect().modifyDamageDealt(attacker, 100, battleContext);

      // Assert
      expect(result).toBeUndefined();
    });

    it('自分が性別不明なら、相手も性別不明でもダメージを変えない', async () => {
      // Arrange
      const { attacker, battleContext } = setUp(Gender.Genderless, Gender.Genderless);

      // Act
      const result = await new RivalryEffect().modifyDamageDealt(attacker, 100, battleContext);

      // Assert
      expect(result).toBeUndefined();
    });

    it('性別が登録されていなければ、ダメージを変えない', async () => {
      // Arrange
      const { attacker, battleContext } = setUp(Gender.Male, null);

      // Act
      const result = await new RivalryEffect().modifyDamageDealt(attacker, 100, battleContext);

      // Assert
      expect(result).toBeUndefined();
    });

    it('育成ポケモンを調べられないときは、ダメージを変えない', async () => {
      // Arrange
      const { attacker, battleContext } = setUp(Gender.Male, Gender.Male);

      // Act
      const result = await new RivalryEffect().modifyDamageDealt(attacker, 100, {
        ...battleContext,
        trainedPokemonRepository: undefined,
      });

      // Assert
      expect(result).toBeUndefined();
    });
  });
});
