import { BattleContext } from './battle-context.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import type { MoveFlag } from '../moves/move-flags';
import type { StatType } from '../moves/effects/base/base-stat-change-effect';

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
  modifyDamage?(
    _pokemon: BattlePokemonStatus,
    _damage: number,
    _battleContext?: BattleContext,
  ): number;

  /**
   * ダメージを与えるとき（OnDealingDamage）に発動する効果
   * @param pokemon 対象のポケモン
   * @param damage 与えるダメージ
   * @param battleContext バトルコンテキスト
   * @returns 修正後のダメージ
   */
  modifyDamageDealt?(
    _pokemon: BattlePokemonStatus,
    _damage: number,
    _battleContext?: BattleContext,
  ): number | Promise<number | undefined>;

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
  passiveEffect?(
    _pokemon: BattlePokemonStatus,
    _battleContext?: BattleContext,
  ): void | Promise<void>;

  /**
   * 命中率を修正する効果
   * @param pokemon 対象のポケモン
   * @param accuracy 現在の命中率（0-100）
   * @param battleContext バトルコンテキスト
   * @returns 修正後の命中率（0-100）、修正しない場合はundefined
   */
  modifyAccuracy?(
    _pokemon: BattlePokemonStatus,
    _accuracy: number,
    _battleContext?: BattleContext,
  ): number | undefined;

  /**
   * 回避率を修正する効果
   * @param pokemon 対象のポケモン
   * @param accuracy 現在の命中率（0-100）
   * @param battleContext バトルコンテキスト
   * @returns 回避率の補正値（0-1）、補正しない場合はundefined
   */
  modifyEvasion?(
    _pokemon: BattlePokemonStatus,
    _accuracy: number,
    _battleContext?: BattleContext,
  ): number | undefined;

  /**
   * 技の優先度を修正する効果
   * @param pokemon 対象のポケモン
   * @param movePriority 技の基本優先度
   * @param battleContext バトルコンテキスト
   * @returns 修正後の優先度、修正しない場合はundefined
   */
  modifyPriority?(
    _pokemon: BattlePokemonStatus,
    _movePriority: number,
    _battleContext?: BattleContext,
  ): number | undefined;

  /**
   * 速度を修正する効果
   * @param pokemon 対象のポケモン
   * @param speed 現在の速度
   * @param battleContext バトルコンテキスト
   * @returns 修正後の速度、修正しない場合はundefined
   */
  modifySpeed?(
    _pokemon: BattlePokemonStatus,
    _speed: number,
    _battleContext?: BattleContext,
  ): number | undefined;

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
   * 能力ランク変更を受けられるかどうかを判定する効果
   * @param pokemon 対象のポケモン
   * @param statType 変更されようとしている能力（'attack'/'defense'/etc）
   * @param rankChange ランク変化量（負の値は下降）
   * @param battleContext バトルコンテキスト
   * @returns 受けられる場合はtrue、無効化する場合はfalse、判定しない場合はundefined
   *          典型用途: クリアボディ / しろいけむり（全ステ低下無効）、はとむね（防御低下無効）など
   */
  canReceiveStatChange?(
    _pokemon: BattlePokemonStatus,
    _statType:
      | 'attack'
      | 'defense'
      | 'specialAttack'
      | 'specialDefense'
      | 'speed'
      | 'accuracy'
      | 'evasion',
    _rankChange: number,
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

  /**
   * 攻撃側: 技のタイプを変更する効果（例: うるおいボイス）
   * 技側の modifyMoveType のあとに呼ばれる
   * @param pokemon 攻撃側のポケモン
   * @param typeName 現在の技のタイプ名（日本語名、例: "ノーマル"）
   * @returns 変更後のタイプ名（日本語名）、変更しない場合はundefined
   */
  modifyMoveType?(
    _pokemon: BattlePokemonStatus,
    _typeName: string,
    _battleContext?: BattleContext,
  ): string | undefined;

  /**
   * 攻撃側: 技フラグを変更する効果（例: えんかくで contact を外す）
   * @param pokemon 攻撃側のポケモン
   * @param flags MoveFlags 表から引いたフラグ
   * @returns 変更後のフラグ、変更しない場合はundefined
   */
  modifyMoveFlags?(
    _pokemon: BattlePokemonStatus,
    _flags: ReadonlySet<MoveFlag>,
    _battleContext?: BattleContext,
  ): ReadonlySet<MoveFlag> | undefined;

  /**
   * 攻撃側: 技の威力を変更する効果（例: てつのこぶし、がんじょうあご）
   * ダメージ計算式に入る前の威力に掛かる
   * @param pokemon 攻撃側のポケモン
   * @param power 現在の威力
   * @returns 変更後の威力、変更しない場合はundefined
   */
  modifyBasePower?(
    _pokemon: BattlePokemonStatus,
    _power: number,
    _battleContext?: BattleContext,
  ): number | undefined;

  /**
   * 場の全員: 場にいる誰かが使った技の威力を変更する効果（例: ダークオーラ、フェアリーオーラ）
   * 攻撃側・防御側の特性の両方で呼ばれる（同じ特性が両側にある場合は1回だけ）。かたやぶりでは無視されない
   * @param holder この特性を持つポケモン
   * @param power 現在の威力
   * @returns 変更後の威力、変更しない場合はundefined
   */
  modifyAnyBasePower?(
    _holder: BattlePokemonStatus,
    _power: number,
    _battleContext?: BattleContext,
  ): number | undefined;

  /**
   * 相手のランク補正を無視する効果（例: てんねん、しんがん）
   * @param pokemon この特性を持つポケモン
   * @param role この特性を持つポケモンが攻撃側か防御側か
   * @returns 無視する相手のランクの一覧、無視しない場合はundefined
   */
  ignoreOpponentRanks?(
    _pokemon: BattlePokemonStatus,
    _role: 'attacker' | 'defender',
    _battleContext?: BattleContext,
  ): readonly StatType[] | undefined;

  /**
   * 攻撃側: タイプ相性で無効になる相手のタイプに、等倍で当てる効果（例: しんがん、きもったま）
   * 相手のタイプごとに、相性が0のときだけ呼ばれる
   * @param pokemon 攻撃側のポケモン
   * @param moveTypeName 技のタイプ名（日本語名）
   * @param defenderTypeName 相性が0になった相手のタイプ名（日本語名）
   * @returns 等倍として扱う場合はtrue
   */
  ignoresTypeImmunity?(
    _pokemon: BattlePokemonStatus,
    _moveTypeName: string,
    _defenderTypeName: string,
    _battleContext?: BattleContext,
  ): boolean | undefined;

  /**
   * 防御側: 技そのものを無効化する効果（例: ぼうおん、ぼうだん、ぼうじん）
   * 変化技を含むすべての技で、命中判定の前に呼ばれる。かたやぶりでは無視される
   * @param pokemon 防御側のポケモン
   * @returns 無効化する場合はtrue
   */
  isImmuneToMove?(
    _pokemon: BattlePokemonStatus,
    _battleContext?: BattleContext,
  ): boolean | undefined;

  /**
   * 技を出す前に、技そのものを失敗させる効果（例: しめりけ、じょおうのいげん、テイルアーマー）
   * 攻撃側（role = 'attacker'）と防御側（role = 'defender'）の両方の特性で、isImmuneToMove と命中判定の前に呼ばれる。
   * 変化技・自分を対象にする技を含むすべての技で呼ばれる。防御側はかたやぶりで無視される
   * @param holder この特性を持つポケモン
   * @param role この特性を持つポケモンが攻撃側か防御側か
   * @returns 技を失敗させる場合はtrue
   */
  preventsMove?(
    _holder: BattlePokemonStatus,
    _role: 'attacker' | 'defender',
    _battleContext?: BattleContext,
  ): boolean | undefined;

  /**
   * 防御側: isImmuneToMove で技を無効にしたあとの効果（例: かぜのりの攻撃ランク+1）
   * isImmuneToMove が true を返したときだけ、PP を消費したあとに呼ばれる
   * @param pokemon 防御側のポケモン
   * @returns メッセージ（nullの場合は何も起こらない）
   */
  onMoveBlocked?(
    _pokemon: BattlePokemonStatus,
    _battleContext?: BattleContext,
  ): Promise<string | null>;

  /**
   * 攻撃側: 連続技の攻撃回数を決める効果（例: スキルリンク）
   * @param pokemon 攻撃側のポケモン
   * @param minHits 技の最小回数
   * @param maxHits 技の最大回数
   * @returns 攻撃回数、変更しない場合はundefined
   */
  modifyMultiHitCount?(
    _pokemon: BattlePokemonStatus,
    _minHits: number,
    _maxHits: number,
    _battleContext?: BattleContext,
  ): number | undefined;

  /**
   * 攻撃側: 単発の攻撃技に追加のヒットを加える効果（例: おやこあい）
   * 連続技ではない攻撃技のときだけ呼ばれる
   * @param pokemon 攻撃側のポケモン
   * @returns 追加ヒットごとの威力倍率（例: [0.25]）、追加しない場合はundefined
   */
  getAdditionalHitPowerRatios?(
    _pokemon: BattlePokemonStatus,
    _battleContext?: BattleContext,
  ): readonly number[] | undefined;

  /**
   * 場にいる間、天候の効果をなくす特性かどうか（例: ノーてんき、エアロック）
   */
  readonly suppressesWeather?: boolean;

  /**
   * 相手の特性を無視して攻撃する特性かどうか（例: かたやぶり、テラボルテージ、ターボブレイズ）
   */
  readonly breaksMold?: boolean;

  /**
   * 防御側: かたやぶり系の特性でも無視されない特性かどうか（例: プリズムアーマー）
   * ダメージ計算・命中判定・技の無効化で参照される（AbilityRegistry.isIgnoredByMoldBreaker）
   */
  readonly unaffectedByMoldBreaker?: boolean;

  /**
   * 攻撃側: 追加効果の発動確率に掛ける倍率（例: てんのめぐみ = 2）
   */
  readonly secondaryEffectChanceMultiplier?: number;

  /**
   * 防御側: 相手の技の追加効果を受けない特性かどうか（例: りんぷん）。かたやぶりでは無視される
   */
  readonly blocksSecondaryEffects?: boolean;

  /**
   * 攻撃側: 与えたダメージに応じた反動を受けない特性かどうか（例: いしあたま、マジックガード）
   * BaseRecoilEffect の afterDamage で参照される
   */
  readonly preventsRecoil?: boolean;
}
