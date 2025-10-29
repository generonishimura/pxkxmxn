import { Pokemon } from './entities/pokemon.entity';
import { Ability } from './entities/ability.entity';

/**
 * Pokemonリポジトリのインターフェース
 * 依存性逆転の原則に従い、Domain層で抽象インターフェースを定義
 */
export interface IPokemonRepository {
  /**
   * IDでポケモンを取得
   */
  findById(id: number): Promise<Pokemon | null>;

  /**
   * 図鑑番号でポケモンを取得
   */
  findByNationalDex(nationalDex: number): Promise<Pokemon | null>;

  /**
   * 名前でポケモンを取得
   */
  findByName(name: string): Promise<Pokemon | null>;
}

/**
 * Abilityリポジトリのインターフェース
 */
export interface IAbilityRepository {
  /**
   * IDで特性を取得
   */
  findById(id: number): Promise<Ability | null>;

  /**
   * 名前で特性を取得（ロジック識別用のキー）
   */
  findByName(name: string): Promise<Ability | null>;

  /**
   * ポケモンIDで所有している特性一覧を取得
   */
  findByPokemonId(pokemonId: number): Promise<Ability[]>;
}

/**
 * DIトークン（Nest.jsでインターフェースを注入するために使用）
 */
export const POKEMON_REPOSITORY_TOKEN = Symbol('IPokemonRepository');
export const ABILITY_REPOSITORY_TOKEN = Symbol('IAbilityRepository');
