import { Trainer } from './entities/trainer.entity';

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
 * DIトークン（Nest.jsでインターフェースを注入するために使用）
 */
export const TRAINER_REPOSITORY_TOKEN = Symbol('ITrainerRepository');

