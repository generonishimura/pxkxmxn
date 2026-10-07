import { Battle } from './entities/battle.entity';
import { BattlePokemonStatus } from './entities/battle-pokemon-status.entity';
import { BattlePokemonMove } from './entities/battle-pokemon-move.entity';
import { StatePatch } from './state/state-field-parser';
import { VolatileState } from './state/volatile-state';
import { PersistentPokemonState } from './state/persistent-state';
import { GlobalFieldState, SideConditions } from './state/side-state';

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
   * ポケモンの VolatileState の一部だけを書き換える
   * 最新の行を読み直して patch を当てるので、同じターンに先に書かれたキーは消えない
   * undefined か null を渡したキーは取り除く
   */
  patchVolatileState(
    statusId: number,
    patch: StatePatch<VolatileState>,
  ): Promise<BattlePokemonStatus>;

  /**
   * ポケモンの PersistentPokemonState の一部だけを書き換える（読み直しは patchVolatileState と同じ）
   */
  patchPersistentState(
    statusId: number,
    patch: StatePatch<PersistentPokemonState>,
  ): Promise<BattlePokemonStatus>;

  /**
   * トレーナーの陣営の SideConditions の一部だけを書き換える
   * 最新の行を読み直して patch を当てるので、同じターンに先に書かれたキーは消えない
   */
  patchSideConditions(
    battleId: number,
    trainerId: number,
    patch: StatePatch<SideConditions>,
  ): Promise<Battle>;

  /**
   * 両陣営にかかる GlobalFieldState の一部だけを書き換える（読み直しは patchSideConditions と同じ）
   */
  patchGlobalFieldState(battleId: number, patch: StatePatch<GlobalFieldState>): Promise<Battle>;

  /**
   * アクティブなポケモンを取得（バトル中で場に出ているポケモン）
   */
  findActivePokemonByBattleIdAndTrainerId(
    battleId: number,
    trainerId: number,
  ): Promise<BattlePokemonStatus | null>;

  /**
   * IDでバトル中のポケモン状態を取得
   */
  findBattlePokemonStatusById(id: number): Promise<BattlePokemonStatus | null>;

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
   * moveId と maxPp を渡すと、技の欄の技そのものを書き換える（スケッチ。交代しても戻らない）。
   * 交代で戻る入れ替え（ものまね・へんしん）は volatileState.moveSlotOverrides に置く
   */
  updateBattlePokemonMove(
    id: number,
    data: { currentPp: number; moveId?: number; maxPp?: number },
  ): Promise<BattlePokemonMove>;

  /**
   * IDでバトル中のポケモンの技を取得
   */
  findBattlePokemonMoveById(id: number): Promise<BattlePokemonMove | null>;
}

/**
 * DIトークン（Nest.jsでインターフェースを注入するために使用）
 */
export const BATTLE_REPOSITORY_TOKEN = Symbol('IBattleRepository');
