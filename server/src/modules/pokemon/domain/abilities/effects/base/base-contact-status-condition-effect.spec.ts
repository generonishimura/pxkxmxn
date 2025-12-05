import { BaseContactStatusConditionEffect } from './base-contact-status-condition-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';
import { ITrainedPokemonRepository } from '@/modules/trainer/domain/trainer.repository.interface';
import { TrainedPokemon } from '@/modules/trainer/domain/entities/trained-pokemon.entity';
import { Pokemon } from '@/modules/pokemon/domain/entities/pokemon.entity';
import { Type } from '@/modules/pokemon/domain/entities/type.entity';
import { Ability } from '@/modules/pokemon/domain/entities/ability.entity';
import { Gender } from '@/modules/trainer/domain/entities/trained-pokemon.entity';
import { Nature } from '@/modules/battle/domain/logic/stat-calculator';
import { AbilityRegistry } from '../../ability-registry';

/**
 * テスト用の具象クラス（どくを付与）
 */
class TestPoisonContactEffect extends BaseContactStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Poison;
  protected readonly chance = 1.0; // テスト用に100%に設定
  protected readonly immuneTypes = ['どく', 'はがね'] as const;
}

describe('BaseContactStatusConditionEffect', () => {
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

  const createMockBattleRepository = (): jest.Mocked<IBattleRepository> => {
    return {
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findBattlePokemonStatusByBattleId: jest.fn(),
      createBattlePokemonStatus: jest.fn(),
      updateBattlePokemonStatus: jest.fn(),
      findActivePokemonByBattleIdAndTrainerId: jest.fn(),
      findBattlePokemonStatusById: jest.fn(),
      findBattlePokemonMovesByBattlePokemonStatusId: jest.fn(),
      createBattlePokemonMove: jest.fn(),
      updateBattlePokemonMove: jest.fn(),
      findBattlePokemonMoveById: jest.fn(),
    };
  };

  const createMockTrainedPokemonRepository = (
    trainedPokemon: TrainedPokemon | null,
  ): jest.Mocked<ITrainedPokemonRepository> => {
    return {
      findById: jest.fn().mockResolvedValue(trainedPokemon),
      findByTrainerId: jest.fn(),
    };
  };

  describe('applyContactStatusCondition', () => {
    it('battleContextがない場合、falseを返す', async () => {
      const effect = new TestPoisonContactEffect();
      const defender = createBattlePokemonStatus();
      const attacker = createBattlePokemonStatus({ id: 2 });

      const result = await effect.applyContactStatusCondition(defender, attacker, undefined);

      expect(result).toBe(false);
    });

    it('battleRepositoryがない場合、falseを返す', async () => {
      const effect = new TestPoisonContactEffect();
      const defender = createBattlePokemonStatus();
      const attacker = createBattlePokemonStatus({ id: 2 });
      const battleContext: BattleContext = {
        battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
        // battleRepository を提供しない
      };

      const result = await effect.applyContactStatusCondition(defender, attacker, battleContext);

      expect(result).toBe(false);
    });

    it('接触技でない場合（Special）、falseを返す', async () => {
      const effect = new TestPoisonContactEffect();
      const defender = createBattlePokemonStatus();
      const attacker = createBattlePokemonStatus({ id: 2 });
      const battleRepository = createMockBattleRepository();
      const battleContext: BattleContext = {
        battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
        battleRepository,
        moveCategory: 'Special',
      };

      const result = await effect.applyContactStatusCondition(defender, attacker, battleContext);

      expect(result).toBe(false);
      expect(battleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('接触技でない場合（Status）、falseを返す', async () => {
      const effect = new TestPoisonContactEffect();
      const defender = createBattlePokemonStatus();
      const attacker = createBattlePokemonStatus({ id: 2 });
      const battleRepository = createMockBattleRepository();
      const battleContext: BattleContext = {
        battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
        battleRepository,
        moveCategory: 'Status',
      };

      const result = await effect.applyContactStatusCondition(defender, attacker, battleContext);

      expect(result).toBe(false);
      expect(battleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('攻撃側が既に状態異常を持っている場合、falseを返す', async () => {
      const effect = new TestPoisonContactEffect();
      const defender = createBattlePokemonStatus();
      const attacker = createBattlePokemonStatus({ id: 2, statusCondition: StatusCondition.Burn });
      const battleRepository = createMockBattleRepository();
      const trainedPokemonRepository = createMockTrainedPokemonRepository(
        createTrainedPokemon(2, createPokemon(2, createType(1, 'ほのお'))),
      );
      const battleContext: BattleContext = {
        battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
        battleRepository,
        trainedPokemonRepository,
        moveCategory: 'Physical',
      };

      const result = await effect.applyContactStatusCondition(defender, attacker, battleContext);

      expect(result).toBe(false);
      expect(battleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('攻撃側のポケモンが見つからない場合、falseを返す', async () => {
      const effect = new TestPoisonContactEffect();
      const defender = createBattlePokemonStatus();
      const attacker = createBattlePokemonStatus({ id: 2 });
      const battleRepository = createMockBattleRepository();
      const trainedPokemonRepository = createMockTrainedPokemonRepository(null);
      const battleContext: BattleContext = {
        battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
        battleRepository,
        trainedPokemonRepository,
        moveCategory: 'Physical',
      };

      const result = await effect.applyContactStatusCondition(defender, attacker, battleContext);

      expect(result).toBe(false);
      expect(battleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('免疫タイプ（プライマリ）の場合、falseを返す', async () => {
      const effect = new TestPoisonContactEffect();
      const defender = createBattlePokemonStatus();
      const attacker = createBattlePokemonStatus({ id: 2 });
      const battleRepository = createMockBattleRepository();
      const trainedPokemonRepository = createMockTrainedPokemonRepository(
        createTrainedPokemon(2, createPokemon(2, createType(1, 'どく'))),
      );
      const battleContext: BattleContext = {
        battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
        battleRepository,
        trainedPokemonRepository,
        moveCategory: 'Physical',
      };

      const result = await effect.applyContactStatusCondition(defender, attacker, battleContext);

      expect(result).toBe(false);
      expect(battleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('免疫タイプ（セカンダリ）の場合、falseを返す', async () => {
      const effect = new TestPoisonContactEffect();
      const defender = createBattlePokemonStatus();
      const attacker = createBattlePokemonStatus({ id: 2 });
      const battleRepository = createMockBattleRepository();
      const trainedPokemonRepository = createMockTrainedPokemonRepository(
        createTrainedPokemon(
          2,
          createPokemon(2, createType(1, 'ほのお'), createType(2, 'はがね')),
        ),
      );
      const battleContext: BattleContext = {
        battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
        battleRepository,
        trainedPokemonRepository,
        moveCategory: 'Physical',
      };

      const result = await effect.applyContactStatusCondition(defender, attacker, battleContext);

      expect(result).toBe(false);
      expect(battleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('正常に状態異常を付与する', async () => {
      const effect = new TestPoisonContactEffect();
      const defender = createBattlePokemonStatus();
      const attacker = createBattlePokemonStatus({ id: 2, statusCondition: null });
      const battleRepository = createMockBattleRepository();
      const trainedPokemonRepository = createMockTrainedPokemonRepository(
        createTrainedPokemon(2, createPokemon(2, createType(1, 'ほのお'))),
      );
      const battleContext: BattleContext = {
        battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
        battleRepository,
        trainedPokemonRepository,
        moveCategory: 'Physical',
      };

      const result = await effect.applyContactStatusCondition(defender, attacker, battleContext);

      expect(result).toBe(true);
      expect(battleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(2, {
        statusCondition: StatusCondition.Poison,
      });
    });

    it('modifyDamageはダメージを変更しない', () => {
      const effect = new TestPoisonContactEffect();
      const pokemon = createBattlePokemonStatus();
      const damage = 100;

      const result = effect.modifyDamage(pokemon, damage, undefined);

      expect(result).toBe(damage);
    });
  });
});

