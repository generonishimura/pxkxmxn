import { Injectable, Inject } from '@nestjs/common';
import { Pokemon } from '../../domain/entities/pokemon.entity';
import {
  IPokemonRepository,
  POKEMON_REPOSITORY_TOKEN,
} from '../../domain/pokemon.repository.interface';

/**
 * ポケモン取得ユースケース
 * IDでポケモンを取得するビジネスロジック
 */
@Injectable()
export class GetPokemonByIdUseCase {
  constructor(
    @Inject(POKEMON_REPOSITORY_TOKEN)
    private readonly pokemonRepository: IPokemonRepository
  ) {}

  /**
   * IDでポケモンを取得
   * @param id ポケモンID
   * @returns ポケモンエンティティ、または null
   */
  async execute(id: number): Promise<Pokemon | null> {
    return await this.pokemonRepository.findById(id);
  }
}
