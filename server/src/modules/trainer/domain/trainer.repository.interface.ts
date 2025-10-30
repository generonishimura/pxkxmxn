import { Trainer } from './entities/trainer.entity';
import { TrainedPokemon } from './entities/trained-pokemon.entity';

/**
 * Trainerリポジトリのインターフェース
 * 依存性逆転の原則に従い、Domain層で抽象インターフェースを定義
 */
export interface ITrainerRepository {
  /**
   * IDでトレーナーを取得
   */
  findById(id: number): Promise<Trainer | null>;

  /**
   * 名前でトレーナーを取得
   */
  findByName(name: string): Promise<Trainer | null>;

  /**
   * メールアドレスでトレーナーを取得
   */
  findByEmail(email: string): Promise<Trainer | null>;

  /**
   * トレーナーを作成
   */
  create(data: {
    name: string;
    email?: string;
  }): Promise<Trainer>;

  /**
   * トレーナーを更新
   */
  update(id: number, data: Partial<Trainer>): Promise<Trainer>;

  /**
   * トレーナーを削除
   */
  delete(id: number): Promise<void>;

  /**
   * すべてのトレーナーを取得
   */
  findAll(): Promise<Trainer[]>;
}

/**
 * TrainedPokemonリポジトリのインターフェース
 */
export interface ITrainedPokemonRepository {
  /**
   * IDで育成ポケモンを取得（関連データ含む）
   */
  findById(id: number): Promise<TrainedPokemon | null>;

  /**
   * トレーナーIDで育成ポケモン一覧を取得
   */
  findByTrainerId(trainerId: number): Promise<TrainedPokemon[]>;
}

/**
 * TeamMemberの情報（リポジトリから返される）
 */
export interface TeamMemberInfo {
  id: number;
  teamId: number;
  trainedPokemon: TrainedPokemon;
  position: number;
}

/**
 * Teamリポジトリのインターフェース
 */
export interface ITeamRepository {
  /**
   * チームIDでチームメンバー一覧を取得（TrainedPokemon含む、position順）
   */
  findMembersByTeamId(teamId: number): Promise<TeamMemberInfo[]>;
}

/**
 * DIトークン（Nest.jsでインターフェースを注入するために使用）
 */
export const TRAINER_REPOSITORY_TOKEN = Symbol('ITrainerRepository');
export const TRAINED_POKEMON_REPOSITORY_TOKEN = Symbol('ITrainedPokemonRepository');
export const TEAM_REPOSITORY_TOKEN = Symbol('ITeamRepository');

