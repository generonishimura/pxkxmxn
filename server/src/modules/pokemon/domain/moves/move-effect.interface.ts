import { BattleContext } from '../abilities/battle-context.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Move } from '../entities/move.entity';

/**
 * 技の特殊効果のインターフェース
 * 各技の特殊効果ロジックが実装すべき共通規格
 *
 * 技は様々なタイミングで特殊効果を発動するため、それぞれのタイミングに対応するメソッドを定義。
 * 実装クラスは、必要なメソッドのみを実装すればよい（空実装も可）。
 */
export interface IMoveEffect {
  /**
   * 技が命中したとき（ダメージ適用後）に発動する効果
   * @param attacker 攻撃側のポケモン
   * @param defender 防御側のポケモン
   * @param battleContext バトルコンテキスト
   * @returns メッセージ（nullの場合は何も起こらない）
   */
  onHit?(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null>;

  /**
   * 技が外れたときに発動する効果
   * @param attacker 攻撃側のポケモン
   * @param defender 防御側のポケモン
   * @param battleContext バトルコンテキスト
   * @returns メッセージ（nullの場合は何も起こらない）
   */
  onMiss?(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null>;

  /**
   * ダメージ計算前に発動する効果
   * @param attacker 攻撃側のポケモン
   * @param defender 防御側のポケモン
   * @param move 使用する技
   * @param battleContext バトルコンテキスト
   */
  beforeDamage?(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    move: Move,
    battleContext: BattleContext,
  ): Promise<void>;

  /**
   * ダメージ適用後に発動する効果
   * @param attacker 攻撃側のポケモン
   * @param defender 防御側のポケモン
   * @param damage 与えたダメージ
   * @param battleContext バトルコンテキスト
   * @returns メッセージ（nullの場合は何も起こらない）
   */
  afterDamage?(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    damage: number,
    battleContext: BattleContext,
  ): Promise<string | null>;

  /**
   * 変化技を使用したときに発動する効果
   * 変化技（Status技）はダメージを与えないため、このメソッドで処理する
   * @param attacker 攻撃側のポケモン
   * @param defender 防御側のポケモン
   * @param battleContext バトルコンテキスト
   * @returns メッセージ（nullの場合は何も起こらない）
   */
  onUse?(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null>;
}
