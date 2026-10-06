import { BattleContext } from '../abilities/battle-context.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Move } from '../entities/move.entity';
import type { StatType } from './effects/base/base-stat-change-effect';

/**
 * 攻撃に使う能力の参照先（イカサマ、ボディプレスなど）
 */
export interface AttackStatOverride {
  /**
   * 能力値とランクを誰から取るか
   */
  source: 'attacker' | 'defender';
  /**
   * 使う能力
   */
  stat: 'attack' | 'defense' | 'specialAttack' | 'specialDefense';
}

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
   * 技のタイプを決めたあとに呼ばれる。battleContext.moveTypeName は決まったタイプ、
   * battleContext.moveTypeEffectiveness は技全体のタイプ相性（0 なら技が相手に効かない）
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

  /**
   * 技を出す前に、技が失敗するかを判定する効果（例: ゆめくいは相手がねむりでなければ失敗）
   * 特性の preventsMove・isImmuneToMove のあと、命中判定の前に呼ばれる。変化技でも呼ばれる
   * @returns 失敗する場合はtrue
   */
  shouldFail?(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): boolean | undefined;

  /**
   * ダメージ計算前に技のタイプを変更する効果（例: ウェザーボール）
   * 命中判定のあと、beforeDamage の前（攻撃側特性の modifyMoveType の前）に呼ばれる
   * @returns 変更後のタイプ名（日本語名、例: "ほのお"）、変更しない場合はundefined
   */
  modifyMoveType?(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): string | undefined;

  /**
   * ダメージ計算前に技の威力を変更する効果（例: たたりめ、からげんき、アシストパワー）
   * タイプ確定後に呼ばれる（battleContext.moveTypeName は変更後のタイプ）
   * @returns 変更後の威力、変更しない場合はundefined
   */
  modifyMovePower?(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): number | undefined;

  /**
   * 無視する防御側のランク（例: なしくずし = ['defense', 'specialDefense', 'evasion']）
   */
  readonly ignoredDefenderRanks?: readonly StatType[];

  /**
   * 攻撃に使う能力の参照先を変える（例: イカサマ = { source: 'defender', stat: 'attack' }）
   */
  readonly attackStatOverride?: AttackStatOverride;

  /**
   * やけどによる物理技のダメージ半減を受けないかどうか（例: からげんき）
   */
  readonly ignoresBurnPenalty?: boolean;

  /**
   * タイプなしの技かどうか（例: わるあがき）
   * true なら executeMove がタイプ相性表にもポケモンのタイプにもないタイプで計算する（相性1倍・タイプ一致なし）。
   * 技・特性の modifyMoveType は呼ばない（スキン系などでタイプが変わらない。本家と同じ）
   */
  readonly typeless?: boolean;

  /**
   * 反動または外したときの自傷がある技かどうか（すてみの対象。例: すてみタックル、とびげり）
   * executeMove がコンテキストの hasRecoil に入れる
   */
  readonly hasRecoil?: boolean;
}
