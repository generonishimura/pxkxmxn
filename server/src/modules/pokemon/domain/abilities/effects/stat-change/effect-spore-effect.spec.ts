import { EffectSporeEffect } from './effect-spore-effect';
import { AbilityRegistry } from '../../ability-registry';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';
import { ITrainedPokemonRepository } from '@/modules/trainer/domain/trainer.repository.interface';
import { TrainedPokemon, Gender } from '@/modules/trainer/domain/entities/trained-pokemon.entity';
import { Pokemon } from '@/modules/pokemon/domain/entities/pokemon.entity';
import { Type } from '@/modules/pokemon/domain/entities/type.entity';
import { Nature } from '@/modules/battle/domain/logic/stat-calculator';
import {
  Ability,
  AbilityTrigger,
  AbilityCategory,
} from '@/modules/pokemon/domain/entities/ability.entity';

describe('EffectSporeEffect', () => {
  const createStatus = (id: number): BattlePokemonStatus =>
    new BattlePokemonStatus(id, 1, id, id, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const createTrainedPokemonRepository = (
    typeName: string,
    abilityName: string | null = null,
  ): jest.Mocked<ITrainedPokemonRepository> => {
    const pokemon = new Pokemon(
      2,
      1,
      'TestPokemon',
      'TestPokemon',
      new Type(1, typeName, 'TestType'),
      null,
      100,
      100,
      100,
      100,
      100,
      100,
    );
    const trainedPokemon = new TrainedPokemon(
      2,
      1,
      pokemon,
      null,
      50,
      Gender.Male,
      Nature.Hardy,
      abilityName
        ? new Ability(
            1,
            abilityName,
            abilityName,
            'テスト用',
            AbilityTrigger.Passive,
            AbilityCategory.Immunity,
          )
        : null,
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
    return {
      findById: jest.fn().mockResolvedValue(trainedPokemon),
      findByTrainerId: jest.fn(),
    };
  };

  const createContext = (
    battleRepository: IBattleRepository,
    attackerTypeName: string = 'ノーマル',
    attackerAbilityName: string | null = null,
  ): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    battleRepository,
    trainedPokemonRepository: createTrainedPokemonRepository(attackerTypeName, attackerAbilityName),
    moveCategory: 'Physical',
  });

  const createBattleRepository = (): jest.Mocked<IBattleRepository> =>
    ({
      updateBattlePokemonStatus: jest.fn(),
    }) as unknown as jest.Mocked<IBattleRepository>;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    [0.0, StatusCondition.Poison],
    [0.089, StatusCondition.Poison],
    [0.09, StatusCondition.Paralysis],
    [0.189, StatusCondition.Paralysis],
    [0.19, StatusCondition.Sleep],
    [0.299, StatusCondition.Sleep],
  ])('乱数が%sのとき、攻撃側を%sにする', async (randomValue, expected) => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(randomValue);
    const effect = new EffectSporeEffect();
    const battleRepository = createBattleRepository();

    // Act
    const result = await effect.applyContactStatusCondition(
      createStatus(1),
      createStatus(2),
      createContext(battleRepository),
    );

    // Assert
    expect(result).toBe(true);
    expect(battleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(2, {
      statusCondition: expected,
    });
  });

  it('乱数が0.3以上のとき、状態異常にしない', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0.3);
    const effect = new EffectSporeEffect();
    const battleRepository = createBattleRepository();

    // Act
    const result = await effect.applyContactStatusCondition(
      createStatus(1),
      createStatus(2),
      createContext(battleRepository),
    );

    // Assert
    expect(result).toBe(false);
    expect(battleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });

  it('攻撃側がくさタイプのとき、状態異常にしない', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0.0);
    const effect = new EffectSporeEffect();
    const battleRepository = createBattleRepository();

    // Act
    const result = await effect.applyContactStatusCondition(
      createStatus(1),
      createStatus(2),
      createContext(battleRepository, 'くさ'),
    );

    // Assert
    expect(result).toBe(false);
    expect(battleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });

  it.each([
    ['どく', 0.05],
    ['はがね', 0.05],
    ['でんき', 0.15],
  ])(
    '攻撃側が%sタイプで乱数が%sのとき、その状態異常にならないため状態異常にしない',
    async (typeName, randomValue) => {
      // Arrange
      jest.spyOn(Math, 'random').mockReturnValue(randomValue);
      const effect = new EffectSporeEffect();
      const battleRepository = createBattleRepository();

      // Act
      const result = await effect.applyContactStatusCondition(
        createStatus(1),
        createStatus(2),
        createContext(battleRepository, typeName),
      );

      // Assert
      expect(result).toBe(false);
      expect(battleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['どく', 0.15, StatusCondition.Paralysis],
    ['はがね', 0.25, StatusCondition.Sleep],
    ['でんき', 0.05, StatusCondition.Poison],
    ['でんき', 0.25, StatusCondition.Sleep],
  ])(
    '攻撃側が%sタイプで乱数が%sのとき、効く状態異常（%s）にはする',
    async (typeName, randomValue, expected) => {
      // Arrange
      jest.spyOn(Math, 'random').mockReturnValue(randomValue);
      const effect = new EffectSporeEffect();
      const battleRepository = createBattleRepository();

      // Act
      const result = await effect.applyContactStatusCondition(
        createStatus(1),
        createStatus(2),
        createContext(battleRepository, typeName),
      );

      // Assert
      expect(result).toBe(true);
      expect(battleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(2, {
        statusCondition: expected,
      });
    },
  );

  it('ねむりが選ばれても攻撃側がふみんのとき、状態異常にしない', async () => {
    // Arrange
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    jest.spyOn(Math, 'random').mockReturnValue(0.25);
    const effect = new EffectSporeEffect();
    const battleRepository = createBattleRepository();

    // Act
    const result = await effect.applyContactStatusCondition(
      createStatus(1),
      createStatus(2),
      createContext(battleRepository, 'ノーマル', 'ふみん'),
    );

    // Assert
    expect(result).toBe(false);
    expect(battleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });

  it('攻撃側がぼうじんのとき、状態異常にしない', async () => {
    // Arrange
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    jest.spyOn(Math, 'random').mockReturnValue(0.0);
    const effect = new EffectSporeEffect();
    const battleRepository = createBattleRepository();
    const battleContext: BattleContext = {
      ...createContext(battleRepository, 'ノーマル', 'ぼうじん'),
      defenderAbilityName: 'ほうし',
    };

    // Act
    const result = await effect.applyContactStatusCondition(
      createStatus(1),
      createStatus(2),
      battleContext,
    );

    // Assert
    expect(result).toBe(false);
    expect(battleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });

  it('AbilityRegistryに「ほうし」として登録されている', () => {
    // Arrange
    AbilityRegistry.clear();
    AbilityRegistry.initialize();

    // Act
    const effect = AbilityRegistry.get('ほうし');

    // Assert
    expect(effect).toBeInstanceOf(EffectSporeEffect);
  });
});
