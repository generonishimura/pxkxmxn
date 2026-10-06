import { BaseContactStatChangeEffect } from './base-contact-stat-change-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';
import { ITrainedPokemonRepository } from '@/modules/trainer/domain/trainer.repository.interface';
import { TrainedPokemon, Gender } from '@/modules/trainer/domain/entities/trained-pokemon.entity';
import { Pokemon } from '@/modules/pokemon/domain/entities/pokemon.entity';
import { Type } from '@/modules/pokemon/domain/entities/type.entity';
import {
  Ability,
  AbilityTrigger,
  AbilityCategory,
} from '@/modules/pokemon/domain/entities/ability.entity';
import { Nature } from '@/modules/battle/domain/logic/stat-calculator';
import { AbilityRegistry } from '../../ability-registry';

/**
 * テスト用の具象クラス（攻撃側の素早さを1段階下げる）
 */
class TestAttackerSpeedDropEffect extends BaseContactStatChangeEffect {
  protected readonly target = 'attacker' as const;
  protected readonly statChanges = [{ statType: 'speed', rankChange: -1 }] as const;
}

/**
 * テスト用の具象クラス（自分の防御を1段階下げ、素早さを2段階上げる）
 */
class TestDefenderMultiChangeEffect extends BaseContactStatChangeEffect {
  protected readonly target = 'defender' as const;
  protected readonly statChanges = [
    { statType: 'defense', rankChange: -1 },
    { statType: 'speed', rankChange: 2 },
  ] as const;
}

describe('BaseContactStatChangeEffect', () => {
  const createStatus = (
    id: number,
    overrides?: { currentHp?: number; defenseRank?: number; speedRank?: number },
  ): BattlePokemonStatus =>
    new BattlePokemonStatus(
      id,
      1,
      id,
      id,
      true,
      overrides?.currentHp ?? 100,
      100,
      0,
      overrides?.defenseRank ?? 0,
      0,
      0,
      overrides?.speedRank ?? 0,
      0,
      0,
      null,
    );

  const createMockBattleRepository = (): jest.Mocked<IBattleRepository> => ({
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
    patchVolatileState: jest.fn(),
    patchPersistentState: jest.fn(),
    patchSideConditions: jest.fn(),
    patchGlobalFieldState: jest.fn(),
  });

  const createTrainedPokemonRepository = (
    abilityName: string | null,
  ): jest.Mocked<ITrainedPokemonRepository> => {
    const pokemon = new Pokemon(
      2,
      1,
      'TestPokemon',
      'TestPokemon',
      new Type(1, 'ノーマル', 'Normal'),
      null,
      100,
      100,
      100,
      100,
      100,
      100,
    );
    const ability = abilityName
      ? new Ability(
          1,
          abilityName,
          abilityName,
          'テスト用',
          AbilityTrigger.Passive,
          AbilityCategory.StatChange,
        )
      : null;
    const trainedPokemon = new TrainedPokemon(
      2,
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
    return {
      findById: jest.fn().mockResolvedValue(trainedPokemon),
      findByTrainerId: jest.fn(),
    };
  };

  const createContext = (
    battleRepository: IBattleRepository | undefined,
    moveCategory: BattleContext['moveCategory'],
    trainedPokemonRepository?: ITrainedPokemonRepository,
  ): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    battleRepository,
    trainedPokemonRepository,
    moveCategory,
  });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  describe('applyContactStatusCondition', () => {
    it('battleContextがない場合、falseを返す', async () => {
      // Arrange
      const effect = new TestAttackerSpeedDropEffect();

      // Act
      const result = await effect.applyContactStatusCondition(
        createStatus(1),
        createStatus(2),
        undefined,
      );

      // Assert
      expect(result).toBe(false);
    });

    it('battleRepositoryがない場合、falseを返す', async () => {
      // Arrange
      const effect = new TestAttackerSpeedDropEffect();

      // Act
      const result = await effect.applyContactStatusCondition(
        createStatus(1),
        createStatus(2),
        createContext(undefined, 'Physical'),
      );

      // Assert
      expect(result).toBe(false);
    });

    it('特殊技の場合、能力ランクを変更しない', async () => {
      // Arrange
      const effect = new TestAttackerSpeedDropEffect();
      const battleRepository = createMockBattleRepository();

      // Act
      const result = await effect.applyContactStatusCondition(
        createStatus(1),
        createStatus(2),
        createContext(battleRepository, 'Special'),
      );

      // Assert
      expect(result).toBe(false);
      expect(battleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('対象が攻撃側の場合、攻撃側の能力ランクを変更する', async () => {
      // Arrange
      const effect = new TestAttackerSpeedDropEffect();
      const battleRepository = createMockBattleRepository();

      // Act
      const result = await effect.applyContactStatusCondition(
        createStatus(1),
        createStatus(2, { speedRank: 1 }),
        createContext(battleRepository, 'Physical'),
      );

      // Assert
      expect(result).toBe(true);
      expect(battleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(2, { speedRank: 0 });
    });

    it('対象が防御側の場合、防御側の複数の能力ランクをまとめて変更する', async () => {
      // Arrange
      const effect = new TestDefenderMultiChangeEffect();
      const battleRepository = createMockBattleRepository();

      // Act
      const result = await effect.applyContactStatusCondition(
        createStatus(1),
        createStatus(2),
        createContext(battleRepository, 'Physical'),
      );

      // Assert
      expect(result).toBe(true);
      expect(battleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
        defenseRank: -1,
        speedRank: 2,
      });
    });

    it('ランクは-6から+6の範囲に収める', async () => {
      // Arrange
      const effect = new TestDefenderMultiChangeEffect();
      const battleRepository = createMockBattleRepository();

      // Act
      await effect.applyContactStatusCondition(
        createStatus(1, { defenseRank: -6, speedRank: 5 }),
        createStatus(2),
        createContext(battleRepository, 'Physical'),
      );

      // Assert
      expect(battleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(1, { speedRank: 6 });
    });

    it('すべての能力ランクが限界の場合、falseを返す', async () => {
      // Arrange
      const effect = new TestAttackerSpeedDropEffect();
      const battleRepository = createMockBattleRepository();

      // Act
      const result = await effect.applyContactStatusCondition(
        createStatus(1),
        createStatus(2, { speedRank: -6 }),
        createContext(battleRepository, 'Physical'),
      );

      // Assert
      expect(result).toBe(false);
      expect(battleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('対象のポケモンがひんしの場合、falseを返す', async () => {
      // Arrange
      const effect = new TestDefenderMultiChangeEffect();
      const battleRepository = createMockBattleRepository();

      // Act
      const result = await effect.applyContactStatusCondition(
        createStatus(1, { currentHp: 0 }),
        createStatus(2),
        createContext(battleRepository, 'Physical'),
      );

      // Assert
      expect(result).toBe(false);
      expect(battleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('攻撃側の特性が能力ランク低下を防ぐ場合（クリアボディ）、ランクを下げない', async () => {
      // Arrange
      const effect = new TestAttackerSpeedDropEffect();
      const battleRepository = createMockBattleRepository();

      // Act
      const result = await effect.applyContactStatusCondition(
        createStatus(1),
        createStatus(2),
        createContext(battleRepository, 'Physical', createTrainedPokemonRepository('クリアボディ')),
      );

      // Assert
      expect(result).toBe(false);
      expect(battleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('攻撃側の特性が能力ランク低下を防がない場合、ランクを下げる', async () => {
      // Arrange
      const effect = new TestAttackerSpeedDropEffect();
      const battleRepository = createMockBattleRepository();

      // Act
      const result = await effect.applyContactStatusCondition(
        createStatus(1),
        createStatus(2),
        createContext(battleRepository, 'Physical', createTrainedPokemonRepository('いかく')),
      );

      // Assert
      expect(result).toBe(true);
      expect(battleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(2, { speedRank: -1 });
    });
  });

  it('modifyDamageはダメージを変更しない', () => {
    // Arrange
    const effect = new TestAttackerSpeedDropEffect();

    // Act
    const result = effect.modifyDamage(createStatus(1), 50);

    // Assert
    expect(result).toBe(50);
  });
});
