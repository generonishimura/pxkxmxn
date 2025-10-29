import { Test, TestingModule } from '@nestjs/testing';
import { GetPokemonByIdUseCase } from './get-pokemon-by-id.use-case';
import {
  IPokemonRepository,
  POKEMON_REPOSITORY_TOKEN,
} from '../../domain/pokemon.repository.interface';
import { Pokemon } from '../../domain/entities/pokemon.entity';
import { Type } from '../../domain/entities/type.entity';

describe('GetPokemonByIdUseCase', () => {
  let useCase: GetPokemonByIdUseCase;
  let repository: jest.Mocked<IPokemonRepository>;

  beforeEach(async () => {
    const mockRepository: jest.Mocked<IPokemonRepository> = {
      findById: jest.fn(),
      findByNationalDex: jest.fn(),
      findByName: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetPokemonByIdUseCase,
        {
          provide: POKEMON_REPOSITORY_TOKEN,
          useValue: mockRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetPokemonByIdUseCase>(GetPokemonByIdUseCase);
    repository = module.get(POKEMON_REPOSITORY_TOKEN);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should return a pokemon when found', async () => {
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

      repository.findById.mockResolvedValue(mockPokemon);

      // Act
      const result = await useCase.execute(pokemonId);

      // Assert
      expect(result).toEqual(mockPokemon);
      expect(repository.findById).toHaveBeenCalledWith(pokemonId);
      expect(repository.findById).toHaveBeenCalledTimes(1);
    });

    it('should return null when pokemon not found', async () => {
      // Arrange
      const pokemonId = 999;
      repository.findById.mockResolvedValue(null);

      // Act
      const result = await useCase.execute(pokemonId);

      // Assert
      expect(result).toBeNull();
      expect(repository.findById).toHaveBeenCalledWith(pokemonId);
      expect(repository.findById).toHaveBeenCalledTimes(1);
    });

    it('should handle repository errors', async () => {
      // Arrange
      const pokemonId = 1;
      const error = new Error('Database error');
      repository.findById.mockRejectedValue(error);

      // Act & Assert
      await expect(useCase.execute(pokemonId)).rejects.toThrow('Database error');
      expect(repository.findById).toHaveBeenCalledWith(pokemonId);
    });
  });
});
