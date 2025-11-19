import { Test, TestingModule } from '@nestjs/testing';
import { GetAbilityEffectUseCase } from './get-ability-effect.use-case';
import {
  IAbilityRepository,
  ABILITY_REPOSITORY_TOKEN,
} from '../../domain/pokemon.repository.interface';
import { Ability, AbilityTrigger, AbilityCategory } from '../../domain/entities/ability.entity';
import { AbilityRegistry } from '../../domain/abilities/ability-registry';
import { IAbilityEffect } from '../../domain/abilities/ability-effect.interface';
import { IntimidateEffect } from '../../domain/abilities/effects/stat-change/intimidate-effect';

describe('GetAbilityEffectUseCase', () => {
  let useCase: GetAbilityEffectUseCase;
  let repository: jest.Mocked<IAbilityRepository>;

  beforeEach(async () => {
    // AbilityRegistryをリセット（各テスト前にクリーンな状態にする）
    const registry = (AbilityRegistry as any).registry;
    if (registry) {
      registry.clear();
    }
    AbilityRegistry.initialize();

    const mockRepository: jest.Mocked<IAbilityRepository> = {
      findById: jest.fn(),
      findByName: jest.fn(),
      findByPokemonId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAbilityEffectUseCase,
        {
          provide: ABILITY_REPOSITORY_TOKEN,
          useValue: mockRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetAbilityEffectUseCase>(GetAbilityEffectUseCase);
    repository = module.get(ABILITY_REPOSITORY_TOKEN);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should return ability effect when ability found in registry', async () => {
      // Arrange
      const abilityName = 'いかく';
      const mockAbility = new Ability(
        1,
        abilityName,
        'Intimidate',
        '場に出すとき、相手の攻撃ランクを1段階下げる',
        AbilityTrigger.OnEntry,
        AbilityCategory.StatChange
      );

      repository.findByName.mockResolvedValue(mockAbility);

      // Act
      const result = await useCase.execute(abilityName);

      // Assert
      expect(result).toBeInstanceOf(IntimidateEffect);
      expect(repository.findByName).toHaveBeenCalledWith(abilityName);
      expect(repository.findByName).toHaveBeenCalledTimes(1);
    });

    it('should return null when ability not found in database', async () => {
      // Arrange
      const abilityName = '存在しない特性';
      repository.findByName.mockResolvedValue(null);

      // Act
      const result = await useCase.execute(abilityName);

      // Assert
      expect(result).toBeNull();
      expect(repository.findByName).toHaveBeenCalledWith(abilityName);
      expect(repository.findByName).toHaveBeenCalledTimes(1);
    });

    it('should return null when ability found but not registered in registry', async () => {
      // Arrange
      const abilityName = '未登録の特性';
      const mockAbility = new Ability(
        2,
        abilityName,
        'UnregisteredAbility',
        '説明',
        AbilityTrigger.Passive,
        AbilityCategory.Other
      );

      repository.findByName.mockResolvedValue(mockAbility);

      // Act
      const result = await useCase.execute(abilityName);

      // Assert
      expect(result).toBeNull();
      expect(repository.findByName).toHaveBeenCalledWith(abilityName);
    });

    it('should handle repository errors', async () => {
      // Arrange
      const abilityName = 'いかく';
      const error = new Error('Database error');
      repository.findByName.mockRejectedValue(error);

      // Act & Assert
      await expect(useCase.execute(abilityName)).rejects.toThrow('Database error');
      expect(repository.findByName).toHaveBeenCalledWith(abilityName);
    });
  });

  describe('executeById', () => {
    it('should return ability effect when ability found by id', async () => {
      // Arrange
      const abilityId = 1;
      const abilityName = 'いかく';
      const mockAbility = new Ability(
        abilityId,
        abilityName,
        'Intimidate',
        '場に出すとき、相手の攻撃ランクを1段階下げる',
        AbilityTrigger.OnEntry,
        AbilityCategory.StatChange
      );

      repository.findById.mockResolvedValue(mockAbility);

      // Act
      const result = await useCase.executeById(abilityId);

      // Assert
      expect(result).toBeInstanceOf(IntimidateEffect);
      expect(repository.findById).toHaveBeenCalledWith(abilityId);
      expect(repository.findById).toHaveBeenCalledTimes(1);
    });

    it('should return null when ability not found by id', async () => {
      // Arrange
      const abilityId = 999;
      repository.findById.mockResolvedValue(null);

      // Act
      const result = await useCase.executeById(abilityId);

      // Assert
      expect(result).toBeNull();
      expect(repository.findById).toHaveBeenCalledWith(abilityId);
    });
  });
});
