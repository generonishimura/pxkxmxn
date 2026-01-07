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

  /**
   * 技のタイプ名（日本語名、例: "ほのお"）
   * タイプによるダメージ修正特性で使用
   */
  moveTypeName?: string;

  /**
   * 連続攻撃技の攻撃回数
   * BaseMultiHitEffectで設定される
   */
  multiHitCount?: number;

  /**
   * 技のカテゴリ（Physical, Special, Status）
   * 接触技の判定などで使用
   */
  moveCategory?: 'Physical' | 'Special' | 'Status';

  /**
   * 攻撃側の特性名（日本語名、例: "かたやぶり"）
   * かたやぶり特性の判定などで使用
   */
  attackerAbilityName?: string;

  /**
   * 技の威力
   * テクニシャンなどの特性で使用
   */
  movePower?: number | null;

  /**
   * 急所が発生したかどうか
   * スナイパーなどの特性で使用
   */
  isCriticalHit?: boolean;

  /**
   * 反動ダメージがある技かどうか
   * すてみなどの特性で使用
   */
  hasRecoil?: boolean;

  /**
   * 追加効果がある技かどうか
   * ちからずくなどの特性で使用
   */
  hasSecondaryEffect?: boolean;
}
