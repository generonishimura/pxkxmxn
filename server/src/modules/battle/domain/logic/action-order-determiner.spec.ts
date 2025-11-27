import { ActionOrderDeterminer, ActionOrderParams } from './action-order-determiner';
import { BattlePokemonStatus } from '../entities/battle-pokemon-status.entity';
import { Battle, BattleStatus, Weather } from '../entities/battle.entity';
import { StatusCondition } from '../entities/status-condition.enum';
import { IMoveRepository } from '@/modules/pokemon/domain/pokemon.repository.interface';
import { ITrainedPokemonRepository } from '@/modules/trainer/domain/trainer.repository.interface';
import { Move, MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { Type } from '@/modules/pokemon/domain/entities/type.entity';
import { TrainedPokemon, Gender } from '@/modules/trainer/domain/entities/trained-pokemon.entity';
import { Pokemon } from '@/modules/pokemon/domain/entities/pokemon.entity';
import {
  Ability,
  AbilityTrigger,
  AbilityCategory,
} from '@/modules/pokemon/domain/entities/ability.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { NotFoundException } from '@/shared/domain/exceptions';
import { Nature } from './stat-calculator';

describe('ActionOrderDeterminer', () => {
  let determiner: ActionOrderDeterminer;
  let moveRepository: jest.Mocked<IMoveRepository>;
  let trainedPokemonRepository: jest.Mocked<ITrainedPokemonRepository>;

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

  const createType = (
    id: number,
    name: string = `Type${id}`,
    nameEn: string = `Type${id}En`,
  ): Type => {
    return new Type(id, name, nameEn);
  };

  const createMove = (id: number, priority: number = 0, overrides?: Partial<Move>): Move => {
    return new Move(
      id,
      overrides?.name ?? `Move${id}`,
      overrides?.nameEn ?? `Move${id}En`,
      overrides?.type ?? createType(1),
      overrides?.category ?? MoveCategory.Physical,
      overrides?.power ?? 100,
      overrides?.accuracy ?? 100,
      overrides?.pp ?? 10,
      priority,
      overrides?.description ?? null,
    );
  };

  const createPokemon = (id: number, baseSpeed: number = 100): Pokemon => {
    return new Pokemon(
      id,
      id, // nationalDex
      `Pokemon${id}`,
      `Pokemon${id}En`,
      createType(1),
      null,
      100, // baseHp
      100, // baseAttack
      100, // baseDefense
      100, // baseSpecialAttack
      100, // baseSpecialDefense
      baseSpeed,
    );
  };

  const createAbility = (id: number, name: string): Ability => {
    return new Ability(
      id,
      name,
      `${name}En`,
      'Description',
      AbilityTrigger.OnEntry,
      AbilityCategory.StatChange,
    );
  };

  const createTrainedPokemon = (
    id: number,
    pokemon: Pokemon,
    ability: Ability | null = null,
    level: number = 50,
    ivSpeed: number = 31,
    evSpeed: number = 252,
    nature: Nature | null = null,
  ): TrainedPokemon => {
    return new TrainedPokemon(
      id,
      1,
      pokemon,
      null,
      level,
      Gender.Male,
      nature,
      ability,
      31, // ivHp
      31, // ivAttack
      31, // ivDefense
      31, // ivSpecialAttack
      31, // ivSpecialDefense
      ivSpeed, // ivSpeed
      0, // evHp
      0, // evAttack
      0, // evDefense
      0, // evSpecialAttack
      0, // evSpecialDefense
      evSpeed, // evSpeed
    );
  };

  beforeEach(() => {
    // リポジトリのモックを作成
    moveRepository = {
      findById: jest.fn(),
      findByPokemonId: jest.fn(),
    };

    trainedPokemonRepository = {
      findById: jest.fn(),
      findByTrainerId: jest.fn(),
    };

    determiner = new ActionOrderDeterminer(moveRepository, trainedPokemonRepository);

    // AbilityRegistryをクリア（テストで登録する特性のために）
    AbilityRegistry.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
    // テストで登録した特性をクリア
    AbilityRegistry.clear();
  });

  describe('determine', () => {
    it('両方がポケモン交代する場合、交代が先に実行される', async () => {
      const battle = createBattle();
      const trainer1Active = createBattlePokemonStatus({ trainerId: 1 });
      const trainer2Active = createBattlePokemonStatus({ trainerId: 2 });

      const params: ActionOrderParams = {
        battle,
        trainer1Action: {
          trainerId: 1,
          switchPokemonId: 10,
        },
        trainer2Action: {
          trainerId: 2,
          switchPokemonId: 20,
        },
        trainer1Active,
        trainer2Active,
      };

      const result = await determiner.determine(params);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        trainerId: 1,
        action: 'switch',
        switchPokemonId: 10,
      });
      expect(result[1]).toEqual({
        trainerId: 2,
        action: 'switch',
        switchPokemonId: 20,
      });
    });

    it('片方が交代、片方が技を使用する場合、交代が先に実行される', async () => {
      const battle = createBattle();
      const trainer1Active = createBattlePokemonStatus({ trainerId: 1 });
      const trainer2Active = createBattlePokemonStatus({ trainerId: 2 });

      const move1 = createMove(1, 0);
      moveRepository.findById.mockResolvedValue(move1);

      const params: ActionOrderParams = {
        battle,
        trainer1Action: {
          trainerId: 1,
          switchPokemonId: 10,
        },
        trainer2Action: {
          trainerId: 2,
          moveId: 1,
        },
        trainer1Active,
        trainer2Active,
      };

      const result = await determiner.determine(params);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        trainerId: 1,
        action: 'switch',
        switchPokemonId: 10,
      });
      expect(result[1]).toEqual({
        trainerId: 2,
        action: 'move',
        moveId: 1,
      });
    });

    it('両方が技を使用する場合、優先度が高い方が先に実行される', async () => {
      const battle = createBattle();
      const trainer1Active = createBattlePokemonStatus({ trainerId: 1 });
      const trainer2Active = createBattlePokemonStatus({ trainerId: 2 });

      const move1 = createMove(1, 1); // 優先度+1
      const move2 = createMove(2, 0); // 優先度0
      moveRepository.findById.mockImplementation(id => {
        if (id === 1) return Promise.resolve(move1);
        if (id === 2) return Promise.resolve(move2);
        return Promise.resolve(null);
      });

      const pokemon1 = createPokemon(1, 100);
      const pokemon2 = createPokemon(2, 200); // 速度が高いが、優先度が低い
      const trainedPokemon1 = createTrainedPokemon(1, pokemon1);
      const trainedPokemon2 = createTrainedPokemon(2, pokemon2);
      trainedPokemonRepository.findById.mockImplementation(id => {
        if (id === 1) return Promise.resolve(trainedPokemon1);
        if (id === 2) return Promise.resolve(trainedPokemon2);
        return Promise.resolve(null);
      });

      const params: ActionOrderParams = {
        battle,
        trainer1Action: {
          trainerId: 1,
          moveId: 1,
        },
        trainer2Action: {
          trainerId: 2,
          moveId: 2,
        },
        trainer1Active,
        trainer2Active,
      };

      const result = await determiner.determine(params);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        trainerId: 1,
        action: 'move',
        moveId: 1,
      });
      expect(result[1]).toEqual({
        trainerId: 2,
        action: 'move',
        moveId: 2,
      });
    });

    it('両方が技を使用し、優先度が同じ場合、速度が高い方が先に実行される', async () => {
      const battle = createBattle();
      const trainer1Active = createBattlePokemonStatus({ trainerId: 1 });
      const trainer2Active = createBattlePokemonStatus({ trainerId: 2 });

      const move1 = createMove(1, 0); // 優先度0
      const move2 = createMove(2, 0); // 優先度0
      moveRepository.findById.mockImplementation(id => {
        if (id === 1) return Promise.resolve(move1);
        if (id === 2) return Promise.resolve(move2);
        return Promise.resolve(null);
      });

      const pokemon1 = createPokemon(1, 200); // 速度が高い
      const pokemon2 = createPokemon(2, 100); // 速度が低い
      const trainedPokemon1 = createTrainedPokemon(1, pokemon1);
      const trainedPokemon2 = createTrainedPokemon(2, pokemon2);
      trainedPokemonRepository.findById.mockImplementation(id => {
        if (id === 1) return Promise.resolve(trainedPokemon1);
        if (id === 2) return Promise.resolve(trainedPokemon2);
        return Promise.resolve(null);
      });

      const params: ActionOrderParams = {
        battle,
        trainer1Action: {
          trainerId: 1,
          moveId: 1,
        },
        trainer2Action: {
          trainerId: 2,
          moveId: 2,
        },
        trainer1Active,
        trainer2Active,
      };

      const result = await determiner.determine(params);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        trainerId: 1,
        action: 'move',
        moveId: 1,
      });
      expect(result[1]).toEqual({
        trainerId: 2,
        action: 'move',
        moveId: 2,
      });
    });

    it('両方が技を使用し、優先度と速度が同じ場合、trainer1が先に実行される', async () => {
      const battle = createBattle();
      const trainer1Active = createBattlePokemonStatus({ trainerId: 1 });
      const trainer2Active = createBattlePokemonStatus({ trainerId: 2 });

      const move1 = createMove(1, 0); // 優先度0
      const move2 = createMove(2, 0); // 優先度0
      moveRepository.findById.mockImplementation(id => {
        if (id === 1) return Promise.resolve(move1);
        if (id === 2) return Promise.resolve(move2);
        return Promise.resolve(null);
      });

      const pokemon1 = createPokemon(1, 100);
      const pokemon2 = createPokemon(2, 100);
      const trainedPokemon1 = createTrainedPokemon(1, pokemon1);
      const trainedPokemon2 = createTrainedPokemon(2, pokemon2);
      trainedPokemonRepository.findById.mockImplementation(id => {
        if (id === 1) return Promise.resolve(trainedPokemon1);
        if (id === 2) return Promise.resolve(trainedPokemon2);
        return Promise.resolve(null);
      });

      const params: ActionOrderParams = {
        battle,
        trainer1Action: {
          trainerId: 1,
          moveId: 1,
        },
        trainer2Action: {
          trainerId: 2,
          moveId: 2,
        },
        trainer1Active,
        trainer2Active,
      };

      const result = await determiner.determine(params);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        trainerId: 1,
        action: 'move',
        moveId: 1,
      });
      expect(result[1]).toEqual({
        trainerId: 2,
        action: 'move',
        moveId: 2,
      });
    });

    it('まひ状態異常のポケモンは速度が0.5倍になる', async () => {
      const battle = createBattle();
      const trainer1Active = createBattlePokemonStatus({
        trainerId: 1,
        statusCondition: StatusCondition.Paralysis,
      });
      const trainer2Active = createBattlePokemonStatus({ trainerId: 2 });

      const move1 = createMove(1, 0);
      const move2 = createMove(2, 0);
      moveRepository.findById.mockImplementation(id => {
        if (id === 1) return Promise.resolve(move1);
        if (id === 2) return Promise.resolve(move2);
        return Promise.resolve(null);
      });

      // trainer1の速度が100、trainer2の速度が60の場合
      // まひによりtrainer1の実効速度は50になり、trainer2より遅くなる
      // その場合、trainer2が先に実行される
      const pokemon1 = createPokemon(1, 100);
      const pokemon2 = createPokemon(2, 60);
      const trainedPokemon1 = createTrainedPokemon(1, pokemon1);
      const trainedPokemon2 = createTrainedPokemon(2, pokemon2);
      trainedPokemonRepository.findById.mockImplementation(id => {
        if (id === 1) return Promise.resolve(trainedPokemon1);
        if (id === 2) return Promise.resolve(trainedPokemon2);
        return Promise.resolve(null);
      });

      const params: ActionOrderParams = {
        battle,
        trainer1Action: {
          trainerId: 1,
          moveId: 1,
        },
        trainer2Action: {
          trainerId: 2,
          moveId: 2,
        },
        trainer1Active,
        trainer2Active,
      };

      const result = await determiner.determine(params);

      // まひにより速度が0.5倍になるため、trainer1の実効速度は50になる
      // trainer2の速度は60なので、trainer2が先に実行される
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        trainerId: 2,
        action: 'move',
        moveId: 2,
      });
      expect(result[1]).toEqual({
        trainerId: 1,
        action: 'move',
        moveId: 1,
      });
    });

    it('Moveが見つからない場合、NotFoundExceptionを投げる', async () => {
      const battle = createBattle();
      const trainer1Active = createBattlePokemonStatus({ trainerId: 1 });
      const trainer2Active = createBattlePokemonStatus({ trainerId: 2 });

      moveRepository.findById.mockResolvedValue(null);

      const params: ActionOrderParams = {
        battle,
        trainer1Action: {
          trainerId: 1,
          moveId: 999,
        },
        trainer2Action: {
          trainerId: 2,
          moveId: 2,
        },
        trainer1Active,
        trainer2Active,
      };

      await expect(determiner.determine(params)).rejects.toThrow(NotFoundException);
      await expect(determiner.determine(params)).rejects.toThrow('Move');
    });

    it('TrainedPokemonが見つからない場合、NotFoundExceptionを投げる', async () => {
      const battle = createBattle();
      const trainer1Active = createBattlePokemonStatus({ trainerId: 1, trainedPokemonId: 999 });
      const trainer2Active = createBattlePokemonStatus({ trainerId: 2 });

      const move1 = createMove(1, 0);
      const move2 = createMove(2, 0);
      moveRepository.findById.mockImplementation(id => {
        if (id === 1) return Promise.resolve(move1);
        if (id === 2) return Promise.resolve(move2);
        return Promise.resolve(null);
      });

      trainedPokemonRepository.findById.mockResolvedValue(null);

      const params: ActionOrderParams = {
        battle,
        trainer1Action: {
          trainerId: 1,
          moveId: 1,
        },
        trainer2Action: {
          trainerId: 2,
          moveId: 2,
        },
        trainer1Active,
        trainer2Active,
      };

      await expect(determiner.determine(params)).rejects.toThrow(NotFoundException);
      await expect(determiner.determine(params)).rejects.toThrow('TrainedPokemon');
    });

    it('特性による優先度補正が適用される（trainer1）', async () => {
      const battle = createBattle();
      const trainer1Active = createBattlePokemonStatus({ trainerId: 1 });
      const trainer2Active = createBattlePokemonStatus({ trainerId: 2 });

      const move1 = createMove(1, 0); // 優先度0
      const move2 = createMove(2, -1); // 優先度-1（trainer2の優先度が低い）
      moveRepository.findById.mockImplementation(id => {
        if (id === 1) return Promise.resolve(move1);
        if (id === 2) return Promise.resolve(move2);
        return Promise.resolve(null);
      });

      // trainer1: baseSpeed=100 → 優先度0 → 特性で+1 → 優先度1
      // trainer2: baseSpeed=200 → 優先度-1
      // 優先度1 > -1なので、trainer1が先になる
      const pokemon1 = createPokemon(1, 100);
      const pokemon2 = createPokemon(2, 200);
      const ability1 = createAbility(1, 'テスト特性');
      const trainedPokemon1 = createTrainedPokemon(1, pokemon1, ability1);
      const trainedPokemon2 = createTrainedPokemon(2, pokemon2);
      trainedPokemonRepository.findById.mockImplementation(id => {
        if (id === 1) return Promise.resolve(trainedPokemon1);
        if (id === 2) return Promise.resolve(trainedPokemon2);
        return Promise.resolve(null);
      });

      // モックの特性効果を作成（優先度を+1にする）
      const mockAbilityEffect = {
        modifyPriority: jest.fn((_pokemon, _movePriority) => _movePriority + 1), // 優先度を+1にする
      };
      AbilityRegistry.register('テスト特性', mockAbilityEffect as any);

      const params: ActionOrderParams = {
        battle,
        trainer1Action: {
          trainerId: 1,
          moveId: 1,
        },
        trainer2Action: {
          trainerId: 2,
          moveId: 2,
        },
        trainer1Active,
        trainer2Active,
      };

      const result = await determiner.determine(params);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        trainerId: 1,
        action: 'move',
        moveId: 1,
      });
      expect(mockAbilityEffect.modifyPriority).toHaveBeenCalled();
    });

    it('特性による優先度補正が適用される（trainer2）', async () => {
      const battle = createBattle();
      const trainer1Active = createBattlePokemonStatus({ trainerId: 1 });
      const trainer2Active = createBattlePokemonStatus({ trainerId: 2 });

      const move1 = createMove(1, -1); // 優先度-1（trainer1の優先度が低い）
      const move2 = createMove(2, 0); // 優先度0
      moveRepository.findById.mockImplementation(id => {
        if (id === 1) return Promise.resolve(move1);
        if (id === 2) return Promise.resolve(move2);
        return Promise.resolve(null);
      });

      // trainer1: baseSpeed=200 → 速度が高いが、優先度が-1
      // trainer2: baseSpeed=100 → 優先度0 → 特性で+1 → 優先度1
      // 優先度1 > -1なので、trainer2が先になる
      const pokemon1 = createPokemon(1, 200);
      const pokemon2 = createPokemon(2, 100);
      const ability2 = createAbility(2, 'テスト特性2');
      const trainedPokemon1 = createTrainedPokemon(1, pokemon1);
      const trainedPokemon2 = createTrainedPokemon(2, pokemon2, ability2);
      trainedPokemonRepository.findById.mockImplementation(id => {
        if (id === 1) return Promise.resolve(trainedPokemon1);
        if (id === 2) return Promise.resolve(trainedPokemon2);
        return Promise.resolve(null);
      });

      // モックの特性効果を作成（優先度を+1にする）
      const mockAbilityEffect = {
        modifyPriority: jest.fn((_pokemon, _movePriority) => _movePriority + 1), // 優先度を+1にする
      };
      AbilityRegistry.register('テスト特性2', mockAbilityEffect as any);

      const params: ActionOrderParams = {
        battle,
        trainer1Action: {
          trainerId: 1,
          moveId: 1,
        },
        trainer2Action: {
          trainerId: 2,
          moveId: 2,
        },
        trainer1Active,
        trainer2Active,
      };

      const result = await determiner.determine(params);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        trainerId: 2,
        action: 'move',
        moveId: 2,
      });
      expect(mockAbilityEffect.modifyPriority).toHaveBeenCalled();
    });

    it('特性による速度補正が適用される（trainer1）', async () => {
      const battle = createBattle();
      const trainer1Active = createBattlePokemonStatus({ trainerId: 1 });
      const trainer2Active = createBattlePokemonStatus({ trainerId: 2 });

      const move1 = createMove(1, 0);
      const move2 = createMove(2, 0);
      moveRepository.findById.mockImplementation(id => {
        if (id === 1) return Promise.resolve(move1);
        if (id === 2) return Promise.resolve(move2);
        return Promise.resolve(null);
      });

      const pokemon1 = createPokemon(1, 100);
      const pokemon2 = createPokemon(2, 150); // 速度が高いが、特性補正によりtrainer1が先になる
      const ability1 = createAbility(1, 'テスト特性3');
      const trainedPokemon1 = createTrainedPokemon(1, pokemon1, ability1);
      const trainedPokemon2 = createTrainedPokemon(2, pokemon2);
      trainedPokemonRepository.findById.mockImplementation(id => {
        if (id === 1) return Promise.resolve(trainedPokemon1);
        if (id === 2) return Promise.resolve(trainedPokemon2);
        return Promise.resolve(null);
      });

      // モックの特性効果を作成（速度を2倍にする）
      const mockAbilityEffect = {
        modifySpeed: jest.fn((_pokemon, speed) => speed * 2), // 速度を2倍にする
      };
      AbilityRegistry.register('テスト特性3', mockAbilityEffect as any);

      const params: ActionOrderParams = {
        battle,
        trainer1Action: {
          trainerId: 1,
          moveId: 1,
        },
        trainer2Action: {
          trainerId: 2,
          moveId: 2,
        },
        trainer1Active,
        trainer2Active,
      };

      const result = await determiner.determine(params);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        trainerId: 1,
        action: 'move',
        moveId: 1,
      });
      expect(mockAbilityEffect.modifySpeed).toHaveBeenCalled();
    });

    it('特性による速度補正が適用される（trainer2）', async () => {
      const battle = createBattle();
      const trainer1Active = createBattlePokemonStatus({ trainerId: 1 });
      const trainer2Active = createBattlePokemonStatus({ trainerId: 2 });

      const move1 = createMove(1, 0);
      const move2 = createMove(2, 0);
      moveRepository.findById.mockImplementation(id => {
        if (id === 1) return Promise.resolve(move1);
        if (id === 2) return Promise.resolve(move2);
        return Promise.resolve(null);
      });

      // trainer1: baseSpeed=100 → 速度152
      // trainer2: baseSpeed=100 → 速度152 → 特性で2倍 → 304
      // 304 > 152なので、trainer2が先になる
      const pokemon1 = createPokemon(1, 100);
      const pokemon2 = createPokemon(2, 100);
      const ability2 = createAbility(2, 'テスト特性4');
      const trainedPokemon1 = createTrainedPokemon(1, pokemon1);
      const trainedPokemon2 = createTrainedPokemon(2, pokemon2, ability2);
      trainedPokemonRepository.findById.mockImplementation(id => {
        if (id === 1) return Promise.resolve(trainedPokemon1);
        if (id === 2) return Promise.resolve(trainedPokemon2);
        return Promise.resolve(null);
      });

      // モックの特性効果を作成（速度を2倍にする）
      const mockAbilityEffect = {
        modifySpeed: jest.fn((_pokemon, speed) => speed * 2), // 速度を2倍にする
      };
      AbilityRegistry.register('テスト特性4', mockAbilityEffect as any);

      const params: ActionOrderParams = {
        battle,
        trainer1Action: {
          trainerId: 1,
          moveId: 1,
        },
        trainer2Action: {
          trainerId: 2,
          moveId: 2,
        },
        trainer1Active,
        trainer2Active,
      };

      const result = await determiner.determine(params);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        trainerId: 2,
        action: 'move',
        moveId: 2,
      });
      expect(mockAbilityEffect.modifySpeed).toHaveBeenCalled();
    });

    it('優先度が低い方が後になる', async () => {
      const battle = createBattle();
      const trainer1Active = createBattlePokemonStatus({ trainerId: 1 });
      const trainer2Active = createBattlePokemonStatus({ trainerId: 2 });

      const move1 = createMove(1, -1); // 優先度-1
      const move2 = createMove(2, 0); // 優先度0
      moveRepository.findById.mockImplementation(id => {
        if (id === 1) return Promise.resolve(move1);
        if (id === 2) return Promise.resolve(move2);
        return Promise.resolve(null);
      });

      const pokemon1 = createPokemon(1, 200); // 速度が高いが、優先度が低いため後になる
      const pokemon2 = createPokemon(2, 100);
      const trainedPokemon1 = createTrainedPokemon(1, pokemon1);
      const trainedPokemon2 = createTrainedPokemon(2, pokemon2);
      trainedPokemonRepository.findById.mockImplementation(id => {
        if (id === 1) return Promise.resolve(trainedPokemon1);
        if (id === 2) return Promise.resolve(trainedPokemon2);
        return Promise.resolve(null);
      });

      const params: ActionOrderParams = {
        battle,
        trainer1Action: {
          trainerId: 1,
          moveId: 1,
        },
        trainer2Action: {
          trainerId: 2,
          moveId: 2,
        },
        trainer1Active,
        trainer2Active,
      };

      const result = await determiner.determine(params);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        trainerId: 2,
        action: 'move',
        moveId: 2,
      });
      expect(result[1]).toEqual({
        trainerId: 1,
        action: 'move',
        moveId: 1,
      });
    });
  });
});
