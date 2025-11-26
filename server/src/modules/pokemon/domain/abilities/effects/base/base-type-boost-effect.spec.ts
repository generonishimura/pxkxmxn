import { BaseTypeBoostEffect } from './base-type-boost-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { ITrainedPokemonRepository } from '@/modules/trainer/domain/trainer.repository.interface';
import { TrainedPokemon } from '@/modules/trainer/domain/entities/trained-pokemon.entity';
import { Pokemon } from '@/modules/pokemon/domain/entities/pokemon.entity';
import { Type } from '@/modules/pokemon/domain/entities/type.entity';
import { Ability } from '@/modules/pokemon/domain/entities/ability.entity';
import { Gender } from '@/modules/trainer/domain/entities/trained-pokemon.entity';
import { Nature } from '@/modules/battle/domain/logic/stat-calculator';

/**
 * テスト用の具象クラス（タイプ一致時に1.5倍）
 */
class TestTypeBoostEffect extends BaseTypeBoostEffect {
  protected readonly damageMultiplier = 1.5;
}

/**
 * テスト用の具象クラス（タイプ一致時に2.0倍）
 */
class TestTypeBoostEffect2x extends BaseTypeBoostEffect {
  protected readonly damageMultiplier = 2.0;
}

describe('BaseTypeBoostEffect', () => {
  // テスト用のヘルパー関数
  const createBattlePokemonStatus = (
    overrides?: Partial<BattlePokemonStatus>,
  ): BattlePokemonStatus => {
    return new BattlePokemonStatus(
      overrides?.id ?? 1,
      overrides?.battleId ?? 1,
      overrides?.trainedPokemonId ?? 1,
      overrides?.trainerId ?? 1,
      overrides?.isActive ?? true,
      overrides?.currentHp ?? 100,
      overrides?.maxHp ?? 100,
      overrides?.attackRank ?? 0,
      overrides?.defenseRank ?? 0,
      overrides?.specialAttackRank ?? 0,
      overrides?.specialDefenseRank ?? 0,
      overrides?.speedRank ?? 0,
      overrides?.accuracyRank ?? 0,
      overrides?.evasionRank ?? 0,
      overrides?.statusCondition ?? null,
    );
  };

  const createBattle = (overrides?: Partial<Battle>): Battle => {
    return new Battle(
      overrides?.id ?? 1,
      overrides?.trainer1Id ?? 1,
      overrides?.trainer2Id ?? 2,
      overrides?.team1Id ?? 1,
      overrides?.team2Id ?? 2,
      overrides?.turn ?? 1,
      overrides?.weather ?? null,
      overrides?.field ?? null,
      overrides?.status ?? BattleStatus.Active,
      overrides?.winnerTrainerId ?? null,
    );
  };

  const createType = (id: number, name: string = `Type${id}`, nameEn: string = `Type${id}En`): Type => {
    return new Type(id, name, nameEn);
  };

  const createPokemon = (
    id: number,
    primaryType: Type,
    secondaryType: Type | null = null,
  ): Pokemon => {
    return new Pokemon(
      id,
      1,
      'TestPokemon',
      'TestPokemon',
      primaryType,
      secondaryType,
      100,
      100,
      100,
      100,
      100,
      100,
    );
  };

  const createTrainedPokemon = (
    id: number,
    pokemon: Pokemon,
    ability: Ability | null = null,
  ): TrainedPokemon => {
    return new TrainedPokemon(
      id,
      1,
      pokemon,
      null,
      50,
      Gender.Male,
      Nature.Hardy,
      ability,
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
  };

  const createMockTrainedPokemonRepository = (
    trainedPokemon: TrainedPokemon | null,
  ): jest.Mocked<ITrainedPokemonRepository> => {
    return {
      findById: jest.fn().mockResolvedValue(trainedPokemon),
      findByTrainerId: jest.fn(),
    };
  };

  describe('modifyDamageDealt', () => {
    it('タイプ一致の場合、ダメージが1.5倍になる', async () => {
      const effect = new TestTypeBoostEffect();
      const pokemon = createBattlePokemonStatus({ trainedPokemonId: 1 });
      const fireType = createType(1, 'ほのお');
      const trainedPokemon = createTrainedPokemon(1, createPokemon(1, fireType));
      const trainedPokemonRepository = createMockTrainedPokemonRepository(trainedPokemon);
      const battleContext: BattleContext = {
        battle: createBattle(),
        trainedPokemonRepository,
        moveTypeName: 'ほのお',
      };

      const result = await effect.modifyDamageDealt(pokemon, 100, battleContext);

      expect(result).toBe(150); // 100 * 1.5 = 150
    });

    it('タイプ一致の場合、ダメージが2.0倍になる', async () => {
      const effect = new TestTypeBoostEffect2x();
      const pokemon = createBattlePokemonStatus({ trainedPokemonId: 1 });
      const fireType = createType(1, 'ほのお');
      const trainedPokemon = createTrainedPokemon(1, createPokemon(1, fireType));
      const trainedPokemonRepository = createMockTrainedPokemonRepository(trainedPokemon);
      const battleContext: BattleContext = {
        battle: createBattle(),
        trainedPokemonRepository,
        moveTypeName: 'ほのお',
      };

      const result = await effect.modifyDamageDealt(pokemon, 100, battleContext);

      expect(result).toBe(200); // 100 * 2.0 = 200
    });

    it('タイプ不一致の場合、undefinedを返す', async () => {
      const effect = new TestTypeBoostEffect();
      const pokemon = createBattlePokemonStatus({ trainedPokemonId: 1 });
      const fireType = createType(1, 'ほのお');
      const waterType = createType(2, 'みず');
      const trainedPokemon = createTrainedPokemon(1, createPokemon(1, fireType));
      const trainedPokemonRepository = createMockTrainedPokemonRepository(trainedPokemon);
      const battleContext: BattleContext = {
        battle: createBattle(),
        trainedPokemonRepository,
        moveTypeName: 'みず',
      };

      const result = await effect.modifyDamageDealt(pokemon, 100, battleContext);

      expect(result).toBeUndefined();
    });

    it('サブタイプが一致する場合、ダメージが1.5倍になる', async () => {
      const effect = new TestTypeBoostEffect();
      const pokemon = createBattlePokemonStatus({ trainedPokemonId: 1 });
      const fireType = createType(1, 'ほのお');
      const flyingType = createType(2, 'ひこう');
      const trainedPokemon = createTrainedPokemon(
        1,
        createPokemon(1, fireType, flyingType),
      );
      const trainedPokemonRepository = createMockTrainedPokemonRepository(trainedPokemon);
      const battleContext: BattleContext = {
        battle: createBattle(),
        trainedPokemonRepository,
        moveTypeName: 'ひこう',
      };

      const result = await effect.modifyDamageDealt(pokemon, 100, battleContext);

      expect(result).toBe(150); // 100 * 1.5 = 150
    });

    it('moveTypeNameがない場合、undefinedを返す', async () => {
      const effect = new TestTypeBoostEffect();
      const pokemon = createBattlePokemonStatus({ trainedPokemonId: 1 });
      const fireType = createType(1, 'ほのお');
      const trainedPokemon = createTrainedPokemon(1, createPokemon(1, fireType));
      const trainedPokemonRepository = createMockTrainedPokemonRepository(trainedPokemon);
      const battleContext: BattleContext = {
        battle: createBattle(),
        trainedPokemonRepository,
      };

      const result = await effect.modifyDamageDealt(pokemon, 100, battleContext);

      expect(result).toBeUndefined();
    });

    it('battleContextがない場合、undefinedを返す', async () => {
      const effect = new TestTypeBoostEffect();
      const pokemon = createBattlePokemonStatus({ trainedPokemonId: 1 });

      const result = await effect.modifyDamageDealt(pokemon, 100, undefined);

      expect(result).toBeUndefined();
    });

    it('trainedPokemonRepositoryがない場合、undefinedを返す', async () => {
      const effect = new TestTypeBoostEffect();
      const pokemon = createBattlePokemonStatus({ trainedPokemonId: 1 });
      const battleContext: BattleContext = {
        battle: createBattle(),
        moveTypeName: 'ほのお',
      };

      const result = await effect.modifyDamageDealt(pokemon, 100, battleContext);

      expect(result).toBeUndefined();
    });

    it('育成ポケモンが見つからない場合、undefinedを返す', async () => {
      const effect = new TestTypeBoostEffect();
      const pokemon = createBattlePokemonStatus({ trainedPokemonId: 1 });
      const trainedPokemonRepository = createMockTrainedPokemonRepository(null);
      const battleContext: BattleContext = {
        battle: createBattle(),
        trainedPokemonRepository,
        moveTypeName: 'ほのお',
      };

      const result = await effect.modifyDamageDealt(pokemon, 100, battleContext);

      expect(result).toBeUndefined();
    });

    it('ダメージが小数になる場合、切り捨てられる', async () => {
      const effect = new TestTypeBoostEffect();
      const pokemon = createBattlePokemonStatus({ trainedPokemonId: 1 });
      const fireType = createType(1, 'ほのお');
      const trainedPokemon = createTrainedPokemon(1, createPokemon(1, fireType));
      const trainedPokemonRepository = createMockTrainedPokemonRepository(trainedPokemon);
      const battleContext: BattleContext = {
        battle: createBattle(),
        trainedPokemonRepository,
        moveTypeName: 'ほのお',
      };

      const result = await effect.modifyDamageDealt(pokemon, 99, battleContext);

      expect(result).toBe(148); // 99 * 1.5 = 148.5 -> 148
    });
  });
});

