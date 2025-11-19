import { BattleContext } from './battle-context.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 特性効果のインターフェース
 * 各特性ロジックが実装すべき共通規格
 *
 * 特性は様々なタイミングで発動するため、それぞれのタイミングに対応するメソッドを定義。
 * 実装クラスは、必要なメソッドのみを実装すればよい（空実装も可）。
 */
export interface IAbilityEffect {
  /**
   * 場に出すとき（OnEntry）に発動する効果
   * @param pokemon 対象のポケモン
   * @param battleContext バトルコンテキスト（必要に応じて拡張）
   */
  onEntry?(_pokemon: BattlePokemonStatus, _battleContext?: BattleContext): void | Promise<void>;

  /**
   * ダメージを受けるとき（OnTakingDamage）に発動する効果
   * @param pokemon 対象のポケモン
   * @param damage 受けるダメージ
   * @param battleContext バトルコンテキスト
   * @returns 修正後のダメージ
   */
  modifyDamage?(_pokemon: BattlePokemonStatus, _damage: number, _battleContext?: BattleContext): number;

  /**
   * ダメージを与えるとき（OnDealingDamage）に発動する効果
   * @param pokemon 対象のポケモン
   * @param damage 与えるダメージ
   * @param battleContext バトルコンテキスト
   * @returns 修正後のダメージ
   */
  modifyDamageDealt?(_pokemon: BattlePokemonStatus, _damage: number, _battleContext?: BattleContext): number;

  /**
   * ターン終了時（OnTurnEnd）に発動する効果
   * @param pokemon 対象のポケモン
   * @param battleContext バトルコンテキスト
   */
  onTurnEnd?(_pokemon: BattlePokemonStatus, _battleContext?: BattleContext): void | Promise<void>;

  /**
   * 場から下がるとき（OnSwitchOut）に発動する効果
   * @param pokemon 対象のポケモン
   * @param battleContext バトルコンテキスト
   */
  onSwitchOut?(_pokemon: BattlePokemonStatus, _battleContext?: BattleContext): void | Promise<void>;

  /**
   * 常時発動（Passive）の効果
   * 必要に応じて様々なメソッドで呼び出される
   */
  passiveEffect?(_pokemon: BattlePokemonStatus, _battleContext?: BattleContext): void | Promise<void>;

  /**
   * 命中率を修正する効果
   * @param pokemon 対象のポケモン
   * @param accuracy 現在の命中率（0-100）
   * @param battleContext バトルコンテキスト
   * @returns 修正後の命中率（0-100）、修正しない場合はundefined
   */
  modifyAccuracy?(_pokemon: BattlePokemonStatus, _accuracy: number, _battleContext?: BattleContext): number | undefined;

  /**
   * 回避率を修正する効果
   * @param pokemon 対象のポケモン
   * @param accuracy 現在の命中率（0-100）
   * @param battleContext バトルコンテキスト
   * @returns 回避率の補正値（0-1）、補正しない場合はundefined
   */
  modifyEvasion?(_pokemon: BattlePokemonStatus, _accuracy: number, _battleContext?: BattleContext): number | undefined;

  /**
   * 技の優先度を修正する効果
   * @param pokemon 対象のポケモン
   * @param movePriority 技の基本優先度
   * @param battleContext バトルコンテキスト
   * @returns 修正後の優先度、修正しない場合はundefined
   */
  modifyPriority?(_pokemon: BattlePokemonStatus, _movePriority: number, _battleContext?: BattleContext): number | undefined;

  /**
   * 速度を修正する効果
   * @param pokemon 対象のポケモン
   * @param speed 現在の速度
   * @param battleContext バトルコンテキスト
   * @returns 修正後の速度、修正しない場合はundefined
   */
  modifySpeed?(_pokemon: BattlePokemonStatus, _speed: number, _battleContext?: BattleContext): number | undefined;

  /**
   * 状態異常を受けられるかどうかを判定する効果
   * @param pokemon 対象のポケモン
   * @param statusCondition 付与されようとしている状態異常
   * @param battleContext バトルコンテキスト
   * @returns 受けられる場合はtrue、無効化する場合はfalse、判定しない場合はundefined
   */
  canReceiveStatusCondition?(
    _pokemon: BattlePokemonStatus,
    _statusCondition: StatusCondition,
    _battleContext?: BattleContext,
  ): boolean | undefined;

  /**
   * 特定のタイプの技に対して無効化を持つかどうかを判定する効果
   * @param pokemon 対象のポケモン
   * @param typeName 技のタイプ名（日本語名、例: "じめん"）
   * @param battleContext バトルコンテキスト
   * @returns 無効化する場合はtrue、無効化しない場合はfalse、判定しない場合はundefined
   */
  isImmuneToType?(
    _pokemon: BattlePokemonStatus,
    _typeName: string,
    _battleContext?: BattleContext,
  ): boolean | undefined;

  /**
   * ダメージを受けた後に発動する効果（HP回復など）
   * タイプ無効化と組み合わせて使用（例: ちくでん、もらいび）
   * @param pokemon 対象のポケモン
   * @param originalDamage 元のダメージ（無効化される前のダメージ）
   * @param battleContext バトルコンテキスト
   */
  onAfterTakingDamage?(
    _pokemon: BattlePokemonStatus,
    _originalDamage: number,
    _battleContext?: BattleContext,
  ): void | Promise<void>;
}
