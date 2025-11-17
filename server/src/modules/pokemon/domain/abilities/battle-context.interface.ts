import { Battle } from '@/modules/battle/domain/entities/battle.entity';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';
import { Weather, Field } from '@/modules/battle/domain/entities/battle.entity';
import { ITrainedPokemonRepository } from '@/modules/trainer/domain/trainer.repository.interface';

/**
 * バトルコンテキスト
 * 特性効果や技の特殊効果の実装時に必要な情報を提供する
 *
 * クリーンアーキテクチャの原則に従い、Domain層の特性効果が
 * Infrastructure層のリポジトリに直接依存しないように、
 * インターフェースを介してアクセスする
 */
export interface BattleContext {
  /**
   * バトルエンティティ
   * 天候やフィールド状態はbattleオブジェクトから取得できる
   */
  battle: Battle;

  /**
   * バトルリポジトリ
   * 特性効果からバトル状態を更新するために使用
   */
  battleRepository?: IBattleRepository;

  /**
   * 育成ポケモンリポジトリ
   * 技の特殊効果からポケモンのタイプ情報などを取得するために使用
   */
  trainedPokemonRepository?: ITrainedPokemonRepository;

  /**
   * 天候
   * ダメージ計算時に使用（battle.weatherと重複するが、利便性のため残す）
   */
  weather?: Weather | null;

  /**
   * フィールド状態
   * ダメージ計算時に使用（battle.fieldと重複するが、利便性のため残す）
   */
  field?: Field | null;
}
