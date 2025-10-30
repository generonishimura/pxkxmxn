import { BattleContext } from './battle-context.interface';
import { BattlePokemonStatus } from '../../../battle/domain/entities/battle-pokemon-status.entity';

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
}
