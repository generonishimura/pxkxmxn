import { BattleContext } from './battle-context.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import type { MoveFlag } from '../moves/move-flags';
import type { StatType } from '../moves/effects/base/base-stat-change-effect';
import type { HitResult } from '../battle-events/hit-result';
import type { EffectSource } from '../battle-events/effect-source';

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
   * ターン終了時の状態異常のダメージを変える効果（例: ポイズンヒール、たいねつ）
   * StatusConditionProcessorService で、どく・もうどく・やけどのダメージを与える前に呼ばれる。
   * 返したダメージは applyIndirectDamage で与える（0ならダメージなし。回復は自分で書き込む）
   * @param holder この特性を持つポケモン
   * @param statusCondition ダメージの原因の状態異常
   * @param damage もとのダメージ
   * @returns 変更後のダメージ、変更しない場合はundefined
   */
  modifyStatusDamage?(
    _holder: BattlePokemonStatus,
    _statusCondition: StatusCondition,
    _damage: number,
    _battleContext?: BattleContext,
  ): number | undefined | Promise<number | undefined>;

  /**
   * ターン終了時に進むねむりのターン数（例: はやおき = 2）
   * StatusConditionProcessorService が StatusConditionHandler.shouldClearSleep の step に渡す
   */
  readonly sleepTurnMultiplier?: number;

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
   * @param source 付与しようとしたもの（canInflictStatus から呼ばれたときに入る）
   * @returns 受けられる場合はtrue、無効化する場合はfalse、判定しない場合はundefined
   */
  canReceiveStatusCondition?(
    _pokemon: BattlePokemonStatus,
    _statusCondition: StatusCondition,
    _battleContext?: BattleContext,
    _source?: EffectSource,
  ): boolean | undefined;

  /**
   * 付与元: 相手のタイプによる状態異常の免疫を無視する効果（例: ふしょく）
   * canInflictStatus で、対象がタイプで防ぐ状態異常のときに付与元の特性として呼ばれる
   * @param holder この特性を持つ付与元のポケモン
   * @param statusCondition 付与しようとしている状態異常
   * @returns 免疫を無視する場合はtrue
   */
  bypassesStatusTypeImmunity?(
    _holder: BattlePokemonStatus,
    _statusCondition: StatusCondition,
    _battleContext?: BattleContext,
  ): boolean | undefined;

  /**
   * 状態異常を付与されたあとに発動する効果（例: シンクロ）
   * inflictStatus で状態異常を書き込んだあとに、付与された側の特性として呼ばれる
   * @param holder この特性を持つ、付与された側のポケモン（付与後の状態）
   * @param statusCondition 付与された状態異常
   * @param source 付与したもの（source.pokemon が自分なら自分で付与した）
   * @returns メッセージ（nullの場合は何も起こらない）
   */
  onStatusInflicted?(
    _holder: BattlePokemonStatus,
    _statusCondition: StatusCondition,
    _source: EffectSource | undefined,
    _battleContext?: BattleContext,
  ): Promise<string | null>;

  /**
   * 付与元: 相手に状態異常を付与したあとに発動する効果（例: どくくぐつ）
   * inflictStatus で状態異常を書き込んだあとに、付与元の特性として呼ばれる。自分に付与したときは呼ばれない
   * @param holder この特性を持つ付与元のポケモン
   * @param target 状態異常を付与された相手（付与後の状態）
   * @param statusCondition 付与した状態異常
   * @returns メッセージ（nullの場合は何も起こらない）
   */
  onInflictStatus?(
    _holder: BattlePokemonStatus,
    _target: BattlePokemonStatus,
    _statusCondition: StatusCondition,
    _battleContext?: BattleContext,
  ): Promise<string | null>;

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
   * 防御側: 接触技などを受けたあと、技全体で1回だけ発動する効果（例: さめはだ、せいでんき、ぬめぬめ）
   * ダメージが1以上のとき、ヒットのループのあと・技の onHit の前に呼ばれる。かたやぶりでは無視されない
   * @param defender 防御側のポケモン（この特性を持つ側）
   * @param attacker 攻撃側のポケモン
   * @returns 発動した場合はtrue（メッセージ「<特性名> activated!」が付く）
   */
  applyContactStatusCondition?(
    _defender: BattlePokemonStatus,
    _attacker: BattlePokemonStatus,
    _battleContext?: BattleContext,
  ): Promise<boolean>;

  /**
   * 防御側: 攻撃技のダメージを受けたヒットごとに発動する効果
   * （例: じきゅうりょく、せいぎのこころ、びびり、みずがため、わたげ、すなはき、てつのトゲ、ゆうばく）
   * ダメージが1以上のヒットのたびに、ダメージを減らした直後に呼ばれる。ひんしになったヒットでも呼ばれる
   * （hit.targetFainted が true）。かたやぶりでは無視されない
   * @param holder この特性を持つ防御側のポケモン（ダメージ反映後の状態）
   * @param attacker 攻撃側のポケモン
   * @param hit このヒットの情報
   * @returns メッセージ（nullの場合は何も起こらない）
   */
  onDamagingHit?(
    _holder: BattlePokemonStatus,
    _attacker: BattlePokemonStatus,
    _hit: HitResult,
    _battleContext?: BattleContext,
  ): Promise<string | null>;

  /**
   * 攻撃側: 攻撃技でダメージを与えたヒットごとに発動する効果（例: どくしゅ、どくのくさり、あくしゅう）
   * 防御側の onDamagingHit のあとに呼ばれる
   * @param holder この特性を持つ攻撃側のポケモン
   * @param target ダメージを受けた防御側のポケモン（ダメージ反映後の状態）
   * @param hit このヒットの情報
   * @returns メッセージ（nullの場合は何も起こらない）
   */
  onSourceDamagingHit?(
    _holder: BattlePokemonStatus,
    _target: BattlePokemonStatus,
    _hit: HitResult,
    _battleContext?: BattleContext,
  ): Promise<string | null>;

  /**
   * 防御側: 攻撃技のすべてのヒットと追加効果のあとに1回だけ発動する効果（例: いかりのこうら、ぎゃくじょう）
   * 合計ダメージが1以上のとき、技の afterDamage のあとに呼ばれる。かたやぶりでは無視されない
   * @param holder この特性を持つ防御側のポケモン
   * @param attacker 攻撃側のポケモン
   * @param hit 技全体の情報（damage は合計、hpBefore は技を受ける前のHP）
   * @returns メッセージ（nullの場合は何も起こらない）
   */
  onAfterMoveHit?(
    _holder: BattlePokemonStatus,
    _attacker: BattlePokemonStatus,
    _hit: HitResult,
    _battleContext?: BattleContext,
  ): Promise<string | null>;

  /**
   * 攻撃側: 自分の攻撃技で相手をひんしにしたときに発動する効果
   * （例: じしんかじょう、ビーストブースト、しろのいななき、くろのいななき）
   * 技の処理がすべて終わったあと、相手がひんしで自分がひんしでないときに呼ばれる
   * @param holder この特性を持つ攻撃側のポケモン
   * @param fainted ひんしになった相手
   * @returns メッセージ（nullの場合は何も起こらない）
   */
  onKnockOut?(
    _holder: BattlePokemonStatus,
    _fainted: BattlePokemonStatus,
    _battleContext?: BattleContext,
  ): Promise<string | null>;

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

  /**
   * 技以外のダメージを受けない特性かどうか（例: マジックガード）
   * applyIndirectDamage（状態異常・反動・外したときの自傷・わるあがき・さめはだ・ナイトメア・ヘドロえき）で参照される。
   * 混乱の自傷は防がない（本家と同じ）
   */
  readonly preventsIndirectDamage?: boolean;

  /**
   * HPを吸い取った相手を、回復させずに同じ量のダメージを与える特性かどうか（例: ヘドロえき）
   * applyDrainHeal で、吸い取られた側の特性として参照される。かたやぶりでは無視されない
   */
  readonly reversesDrainHeal?: boolean;
}
