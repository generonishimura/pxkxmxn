import { Battle } from '../../../battle/domain/entities/battle.entity';
import { IBattleRepository } from '../../../battle/domain/battle.repository.interface';
import { Weather, Field } from '../../../battle/domain/entities/battle.entity';

/**
 * バトルコンテキスト
 * 特性効果の実装時に必要な情報を提供する
 */
export interface BattleContext {
  /**
   * バトルエンティティ
   */
  battle: Battle;

  /**
   * バトルリポジトリ
   * 特性効果からバトル状態を更新するために使用
   */
  battleRepository?: IBattleRepository;

  /**
   * 天候
   * ダメージ計算時に使用
   */
  weather?: Weather | null;

  /**
   * フィールド状態
   * ダメージ計算時に使用
   */
  field?: Field | null;
}

