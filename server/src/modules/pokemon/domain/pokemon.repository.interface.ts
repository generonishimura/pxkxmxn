import { Pokemon } from './entities/pokemon.entity';
import { Ability } from './entities/ability.entity';
import { Move } from './entities/move.entity';
import { Type } from './entities/type.entity';

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
 * Moveリポジトリのインターフェース
 */
export interface IMoveRepository {
  /**
   * IDで技を取得（Type含む）
   */
  findById(id: number): Promise<Move | null>;

  /**
   * ポケモンIDで覚えている技一覧を取得(最大4つ、簡略化のため最初の4つ)
   */
  findByPokemonId(pokemonId: number): Promise<Move[]>;

  /**
   * 技名（DB の name）で技を取得（ゆびをふる・しぜんのちから・わるあがきなど、別の技を名前で出すときに使う）
   * 任意。実装がないときは、名前で技を出す処理が失敗する
   */
  findByName?(name: string): Promise<Move | null>;
}

/**
 * タイプ相性マップ（key: "typeFromId-typeToId", value: effectiveness）
 */
export type TypeEffectivenessMap = Map<string, number>;

/**
 * TypeEffectivenessリポジトリのインターフェース
 */
export interface ITypeEffectivenessRepository {
  /**
   * タイプ相性マップを取得
   */
  getTypeEffectivenessMap(): Promise<TypeEffectivenessMap>;

  /**
   * タイプ名（日本語名、例: "ほのお"）でタイプを取得
   * 技のタイプを変更する効果（ウェザーボール、うるおいボイスなど）で使用
   */
  findTypeByName(name: string): Promise<Type | null>;
}

/**
 * DIトークン（Nest.jsでインターフェースを注入するために使用）
 */
export const POKEMON_REPOSITORY_TOKEN = Symbol('IPokemonRepository');
export const ABILITY_REPOSITORY_TOKEN = Symbol('IAbilityRepository');
export const MOVE_REPOSITORY_TOKEN = Symbol('IMoveRepository');
export const TYPE_EFFECTIVENESS_REPOSITORY_TOKEN = Symbol('ITypeEffectivenessRepository');
