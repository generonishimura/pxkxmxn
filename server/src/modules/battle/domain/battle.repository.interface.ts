import { Battle } from './entities/battle.entity';
import { BattlePokemonStatus } from './entities/battle-pokemon-status.entity';
import { BattlePokemonMove } from './entities/battle-pokemon-move.entity';

/**
 * Battleリポジトリのインターフェース
 * 依存性逆転の原則に従い、Domain層で抽象インターフェースを定義
 */
export interface IBattleRepository {
  /**
   * IDでバトルを取得
   */
  findById(id: number): Promise<Battle | null>;

  /**
   * バトルを作成
   */
  create(data: {
    trainer1Id: number;
    trainer2Id: number;
    team1Id: number;
    team2Id: number;
  }): Promise<Battle>;

  /**
   * バトルを更新
   */
  update(id: number, data: Partial<Battle>): Promise<Battle>;

  /**
   * バトルIDでバトル中のポケモン状態一覧を取得
   */
  findBattlePokemonStatusByBattleId(battleId: number): Promise<BattlePokemonStatus[]>;

  /**
   * バトル中のポケモン状態を作成
   */
  createBattlePokemonStatus(data: {
    battleId: number;
    trainedPokemonId: number;
    trainerId: number;
    currentHp: number;
    maxHp: number;
  }): Promise<BattlePokemonStatus>;

  /**
   * バトル中のポケモン状態を更新
   */
  updateBattlePokemonStatus(
    id: number,
    data: Partial<BattlePokemonStatus>,
  ): Promise<BattlePokemonStatus>;

  /**
   * アクティブなポケモンを取得（バトル中で場に出ているポケモン）
   */
  findActivePokemonByBattleIdAndTrainerId(
    battleId: number,
    trainerId: number,
  ): Promise<BattlePokemonStatus | null>;

  /**
   * バトル中のポケモンの技一覧を取得
   */
  findBattlePokemonMovesByBattlePokemonStatusId(
    battlePokemonStatusId: number,
  ): Promise<BattlePokemonMove[]>;

  /**
   * バトル中のポケモンの技を作成
   */
  createBattlePokemonMove(data: {
    battlePokemonStatusId: number;
    moveId: number;
    currentPp: number;
    maxPp: number;
  }): Promise<BattlePokemonMove>;

  /**
   * バトル中のポケモンの技を更新（PPを更新）
   */
  updateBattlePokemonMove(id: number, data: { currentPp: number }): Promise<BattlePokemonMove>;

  /**
   * IDでバトル中のポケモンの技を取得
   */
  findBattlePokemonMoveById(id: number): Promise<BattlePokemonMove | null>;
}

/**
 * DIトークン（Nest.jsでインターフェースを注入するために使用）
 */
export const BATTLE_REPOSITORY_TOKEN = Symbol('IBattleRepository');
