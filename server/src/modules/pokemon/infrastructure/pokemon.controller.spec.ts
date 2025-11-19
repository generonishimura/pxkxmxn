import { Test, TestingModule } from '@nestjs/testing';
import { PokemonController } from './pokemon.controller';
import { GetPokemonByIdUseCase } from '../application/use-cases/get-pokemon-by-id.use-case';
import { GetAbilityEffectUseCase } from '../application/use-cases/get-ability-effect.use-case';
import { Pokemon } from '../domain/entities/pokemon.entity';
import { Type } from '../domain/entities/type.entity';
import { IntimidateEffect } from '../domain/abilities/effects/stat-change/intimidate-effect';

describe('PokemonController', () => {
  let controller: PokemonController;
  let getPokemonByIdUseCase: jest.Mocked<GetPokemonByIdUseCase>;
  let getAbilityEffectUseCase: jest.Mocked<GetAbilityEffectUseCase>;

  beforeEach(async () => {
    const mockGetPokemonByIdUseCase = {
      execute: jest.fn(),
    };

    const mockGetAbilityEffectUseCase = {
      execute: jest.fn(),
      executeById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PokemonController],
      providers: [
        {
          provide: GetPokemonByIdUseCase,
          useValue: mockGetPokemonByIdUseCase,
        },
        {
          provide: GetAbilityEffectUseCase,
          useValue: mockGetAbilityEffectUseCase,
        },
      ],
    }).compile();

    controller = module.get<PokemonController>(PokemonController);
    getPokemonByIdUseCase = module.get(GetPokemonByIdUseCase);
    getAbilityEffectUseCase = module.get(GetAbilityEffectUseCase);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getPokemonById', () => {
    it('should return pokemon when found', async () => {
      // Arrange
      const pokemonId = 1;
      const mockPokemon = new Pokemon(
        pokemonId,
        1,
        'フシギダネ',
        'Bulbasaur',
        new Type(1, 'くさ', 'Grass'),
        new Type(2, 'どく', 'Poison'),
        45,
        49,
        49,
        65,
        65,
        45
      );

      getPokemonByIdUseCase.execute.mockResolvedValue(mockPokemon);

      // Act
      const result = await controller.getPokemonById(pokemonId);

      // Assert
      expect(result).toEqual(mockPokemon);
      expect(getPokemonByIdUseCase.execute).toHaveBeenCalledWith(pokemonId);
    });

    it('should return not found message when pokemon not found', async () => {
      // Arrange
      const pokemonId = 999;
      getPokemonByIdUseCase.execute.mockResolvedValue(null);

      // Act
      const result = await controller.getPokemonById(pokemonId);

      // Assert
      expect(result).toEqual({ message: 'Pokemon not found' });
      expect(getPokemonByIdUseCase.execute).toHaveBeenCalledWith(pokemonId);
    });
  });

  describe('getAbilityEffect', () => {
    it('should return ability effect information when found', async () => {
      // Arrange
      const abilityName = 'いかく';
      const mockEffect = new IntimidateEffect();

      getAbilityEffectUseCase.execute.mockResolvedValue(mockEffect);

      // Act
      const result = await controller.getAbilityEffect(abilityName);

      // Assert
      expect(result).toEqual({
        abilityName: 'いかく',
        effectClassName: 'IntimidateEffect',
        availableMethods: {
          onEntry: true,
          modifyDamage: false,
          modifyDamageDealt: false,
          onTurnEnd: false,
          onSwitchOut: false,
          passiveEffect: false,
        },
      });
      expect(getAbilityEffectUseCase.execute).toHaveBeenCalledWith(abilityName);
    });

    it('should return not found message when ability or effect not found', async () => {
      // Arrange
      const abilityName = '存在しない特性';
      getAbilityEffectUseCase.execute.mockResolvedValue(null);

      // Act
      const result = await controller.getAbilityEffect(abilityName);

      // Assert
      expect(result).toEqual({ message: 'Ability or effect not found' });
      expect(getAbilityEffectUseCase.execute).toHaveBeenCalledWith(abilityName);
    });
  });
});
