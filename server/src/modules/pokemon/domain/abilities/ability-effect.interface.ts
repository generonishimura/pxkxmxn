import { BattleContext } from './battle-context.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import type { MoveFlag } from '../moves/move-flags';
import type { StatType } from '../moves/effects/base/base-stat-change-effect';
import type { HitResult } from '../battle-events/hit-result';
import type { EffectSource } from '../battle-events/effect-source';
import type { StatChange } from '../battle-events/stat-change';
import type { VolatileKind } from '../battle-events/volatile-infliction';
// 場の状態・設置技・交代の仕組み（Issue #102 #103 #135 一部）
import type { PrimalWeather } from '@/modules/battle/domain/state/side-state';
import type { TrapTarget } from '../battle-events/switching';

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
   * @param source 変化を起こしたもの（applyStatChanges から呼ばれたときに入る。いかくなら name が 'いかく'）
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
    _source?: EffectSource,
  ): boolean | undefined;

  /**
   * 能力ランクが変わる前に、変化量を変える効果（例: たんじゅん = 2倍、あまのじゃく = 逆、ばんけん = いかくで上昇）
   * applyStatChanges で、この特性を持つポケモンのランクが変わるたびに呼ばれる（自分で起こした変化も含む）。
   * 相手の技による変化では、かたやぶりで無視される
   * @param holder この特性を持つ、ランクが変わるポケモン
   * @param change 変化（能力と変化量）
   * @param source 変化を起こしたもの
   * @returns 変更後の変化量（0なら変化なし）、変更しない場合はundefined
   */
  modifyIncomingStatChange?(
    _holder: BattlePokemonStatus,
    _change: StatChange,
    _source: EffectSource | undefined,
    _battleContext?: BattleContext,
  ): number | undefined;

  /**
   * 相手が起こした能力ランクの低下を、受けずに相手へ返す特性かどうか（例: ミラーアーマー）
   * applyStatChanges で参照される。相手の技による低下では、かたやぶりで無視される
   */
  readonly reflectsStatDrops?: boolean;

  /**
   * 自分の能力ランクが変わったあとに発動する効果（例: まけんき、かちき、びびりのいかくへの反応）
   * applyStatChanges でランクを書き込んだあとに呼ばれる。かたやぶりでは無視されない
   * @param holder この特性を持つポケモン（変化後の状態）
   * @param applied 実際に変わった量
   * @param source 変化を起こしたもの
   * @returns メッセージ（nullの場合は何も起こらない）
   */
  onStatChanged?(
    _holder: BattlePokemonStatus,
    _applied: readonly StatChange[],
    _source: EffectSource | undefined,
    _battleContext?: BattleContext,
  ): Promise<string | null>;

  /**
   * 相手の能力ランクが変わったあとに発動する効果（例: びんじょう）
   * applyStatChanges で相手のランクを書き込んだあと、対象の onStatChanged のあとに呼ばれる
   * @param holder この特性を持つポケモン
   * @param opponent ランクが変わった相手（変化後の状態）
   * @param applied 実際に変わった量
   * @param source 変化を起こしたもの（びんじょう自身が起こした変化なら name が 'びんじょう'）
   * @returns メッセージ（nullの場合は何も起こらない）
   */
  onOpponentStatChanged?(
    _holder: BattlePokemonStatus,
    _opponent: BattlePokemonStatus,
    _applied: readonly StatChange[],
    _source: EffectSource | undefined,
    _battleContext?: BattleContext,
  ): Promise<string | null>;

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
   * 防御側: 接触技などを受けたあと、技全体で1回だけ発動する効果（例: せいでんき、ぬめぬめ）
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
   * （例: じきゅうりょく、せいぎのこころ、びびり、みずがため、わたげ、すなはき、とびだすなかみ）
   * てつのトゲ・さめはだ・ゆうばくも BaseContactRecoilDamageEffect がこのフックで作る（接触したヒットごと）。
   * applyContactStatusCondition にも書くと攻撃側が2回ダメージを受ける
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
   * 追加ヒットの威力は1回目と同じで、倍率は基礎ダメージ（ダメージ式の +2 のあと）に4096分率で掛かる
   * @returns 追加ヒットごとのダメージ倍率（例: [0.25]）、追加しない場合はundefined
   */
  getAdditionalHitDamageRatios?(
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
  // ---- 一時的な状態（volatile）の仕組み（Issue #103 #104 #107 #135 一部） ----

  /**
   * 使用者: 技を出そうとしたときに、行動そのものを止める効果（例: なまけ）
   * MoveExecutorService が、ねむり・こおりの判定のあと、ひるみの判定の前に呼ぶ（本家の onBeforeMove の優先度 9）。
   * 呼ばれた技（ゆびをふるで出た技など）では呼ばない
   * @param holder この特性を持つ技の使用者
   * @returns 行動を止めるときはメッセージ（例: "is loafing around!"）、止めないときは null
   */
  onBeforeMove?(
    _holder: BattlePokemonStatus,
    _battleContext?: BattleContext,
  ): Promise<string | null> | string | null;

  /**
   * ひるんで動けなかったときの効果（例: ふくつのこころ）
   * MoveExecutorService が、ひるみで技を出せなかったときに 1 回呼ぶ
   * @returns メッセージ（nullの場合は何も起こらない）
   */
  onFlinch?(_holder: BattlePokemonStatus, _battleContext?: BattleContext): Promise<string | null>;

  /**
   * 一時的な状態（ちょうはつ・メロメロなど）を受けられるかどうか（例: アロマベール、どんかん）
   * canApplyVolatile / tryApplyVolatile が呼ぶ。相手の技で付与されるときは、かたやぶりで無視される。
   * こんらん・ひるみは canReceiveStatusCondition（StatusCondition.Confusion / Flinch）で判定する
   * @returns 受けない場合はfalse、判定しない場合はundefined
   */
  canReceiveVolatile?(
    _holder: BattlePokemonStatus,
    _kind: VolatileKind,
    _battleContext?: BattleContext,
    _source?: EffectSource,
  ): boolean | undefined;

  /**
   * 状態異常がないときに、この状態異常として扱う（例: ぜったいねむり = StatusCondition.Sleep）
   * getEffectiveStatusCondition / resolveEffectiveStatusCondition が参照する（たたりめ・ゆめくい・ねごとなど）。
   * 状態異常の欄には書かない
   */
  readonly treatedAsStatusCondition?: StatusCondition;

  /**
   * 防御側: 相手が自分を対象にする技を出したとき、余分に減らす PP（例: プレッシャー = 1）
   * MoveExecutorService が PP を減らすときに、相手を対象にする技（と mustPressure の技）だけで呼ぶ。
   * かたやぶりでは無視されない
   * @param holder この特性を持つポケモン
   * @param user 技の使用者
   * @returns 余分に減らす PP、減らさない場合はundefined
   */
  modifyOpponentPpDeduction?(
    _holder: BattlePokemonStatus,
    _user: BattlePokemonStatus,
    _battleContext?: BattleContext,
  ): number | undefined;

  /**
   * 使用者: 最初に出した技に固定される特性かどうか（例: ごりむちゅう）
   * true なら MoveExecutorService が、技を出したときに volatileState.choiceLockedMoveId を書く（わるあがきを除く）
   */
  readonly locksMoveChoice?: boolean;

  /**
   * 攻撃側: 相手のみがわり・壁（リフレクター・ひかりのかべ・オーロラベール）・しんぴのまもり・しろいきりを
   * 無視して技を当てる特性かどうか（例: すりぬけ）
   */
  readonly infiltrates?: boolean;

  /**
   * 相手が技を出し終えたあとの効果（例: おどりこ）
   * MoveExecutorService が、相手の技の処理がすべて終わったあとに 1 回呼ぶ（呼ばれた技のあとでは呼ばない）。
   * 相手の技が外れた・失敗したとき、この特性を持つポケモンが隠れている（そらをとぶなど）ときは呼ばない。
   * battleContext.moveName / moveId は相手が最後に出し始めた技（ゆびをふるで出た技なら、その技）。
   * 技を出し直すときは battleContext.callMove を使う（おどりこは runBeforeMoveChecks: true）
   * @param holder この特性を持つポケモン
   * @param user 技を出した相手
   * @returns メッセージ（nullの場合は何も起こらない）
   */
  onOpponentMoveUsed?(
    _holder: BattlePokemonStatus,
    _user: BattlePokemonStatus,
    _battleContext?: BattleContext,
  ): Promise<string | null>;
  // ---- 場の状態・設置技・交代の仕組み（Issue #102 #103 #135 一部） ----

  /**
   * この特性が出すゲンシ天候（はじまりのうみ・おわりのだいち・デルタストリーム。BasePrimalWeatherEffect が持つ）
   * ゲンシ天候を出したポケモンが場を離れたとき、場に同じゲンシ天候の特性のポケモンがいれば、
   * エンジンがそのポケモンに天候を引き継ぐ（いなければ天候が終わる）
   */
  readonly primalWeather?: PrimalWeather;

  /**
   * 防御側: ほえる・ふきとばし・ドラゴンテール・ともえなげ（技の forceSwitch）で交代させられない（例: きゅうばん、ばんけん）
   * 相手の技なので、かたやぶりで無視される
   */
  readonly preventsForcedSwitch?: boolean;

  /**
   * HP が最大 HP の半分以下になったとき、控えと交代する（例: ききかいひ、にげごし）
   * エンジンが、相手の技のダメージ（技のあと）・設置技・ターン終了時のダメージで、HP が半分より上から
   * 半分以下になったときに pendingChoice（emergencyExit）を書き、すぐに交代させる
   */
  readonly switchesOutBelowHalfHp?: boolean;

  /**
   * 相手を逃げられなくするか（例: かげふみ、ありじごく、じりょく）
   * 相手が交代を選んだとき、ExecuteTurnUseCase（PokemonSwitcherService.findSwitchBlocker）が場の相手の特性として呼ぶ。
   * ゴーストタイプの相手は、true を返しても交代できる（エンジンが判定する）。持ち主がひんしのときは呼ばない。
   * とんぼがえり・ほえるなどの交代は止めない
   * @param holder この特性を持つポケモン
   * @param target 交代しようとしている相手（タイプ・特性・地面にいるか）
   * @returns 逃げられなくするなら true
   */
  trapsOpponent?(
    _holder: BattlePokemonStatus,
    _target: TrapTarget,
    _battleContext?: BattleContext,
  ): boolean | undefined;
  // ---- 急所ランク（Issue #111 #135 一部） ----

  /**
   * 攻撃側: 急所ランクを変える効果（例: きょううん = stage + 1、ひとでなし = 相手がどくなら 3）
   * MoveExecutorService が、攻撃技のヒットごとに急所を判定する前に呼ぶ。stage は技・きあいだめ・とぎすますを
   * 反映した急所ランク（0〜3。3 は必ず急所）。返した値は 0〜3 に収める
   * @param holder この特性を持つ攻撃側のポケモン
   * @param stage 今の急所ランク
   * @returns 変更後の急所ランク、変更しない場合はundefined
   */
  modifyCritRatio?(
    _holder: BattlePokemonStatus,
    _stage: number,
    _battleContext?: BattleContext,
  ): number | undefined;

  /**
   * 防御側: 急所に当たらない特性かどうか（例: カブトアーマー、シェルアーマー）
   * MoveExecutorService が急所を判定するときに参照する。かたやぶりで無視される
   */
  readonly preventsCriticalHit?: boolean;
  // ---- 変化技の命中（Issue #135 一部） ----

  /**
   * 技の命中率を、ランク補正の前に変える効果（例: ミラクルスキン = 防御側で変化技なら 50）
   * AccuracyCalculator が、命中率が数値の技（変化技を含む）で、攻撃側（role = 'attacker'）→
   * 防御側（role = 'defender'。かたやぶりで無視される）の順に呼ぶ。このあとにランク補正・じゅうりょく・
   * modifyAccuracy・modifyEvasion が掛かる（本家の ModifyAccuracy）
   * @param holder この特性を持つポケモン
   * @param role この特性を持つポケモンが攻撃側か防御側か
   * @param accuracy 今の命中率（0-100）
   * @returns 変更後の命中率、変更しない場合はundefined
   */
  modifyBaseAccuracy?(
    _holder: BattlePokemonStatus,
    _role: 'attacker' | 'defender',
    _accuracy: number,
    _battleContext?: BattleContext,
  ): number | undefined;

  /**
   * 自分が使う技も、自分が受ける技も必ず当たる特性かどうか（例: ノーガード）
   * AccuracyCalculator と、隠れている相手（そらをとぶなど）に届くかの判定で、攻撃側・防御側の両方を見る。
   * かたやぶりでは無視されない
   */
  readonly ensuresMoveHit?: boolean;
  // ---- きんしのちから（Issue #135 一部） ----

  /**
   * 使用者: 同じ優先度の中での順番を変える効果（例: きんしのちから・あとだし = -0.1、クイックドロウ = +0.1）
   * 行動順を決めるとき（ActionOrderDeterminerService）、modifyPriority のあとの優先度に足す。
   * 1 未満の値を返すので、優先度の違いは越えない（本家の onFractionalPriority）。
   * battleContext.moveCategory などは行動するポケモンが選んだ技。技の実行中の effectivePriority には入らない
   * @param holder この特性を持つ、行動するポケモン
   * @returns 足す値（-1 より大きく 1 より小さい数）、変えない場合はundefined
   */
  modifyFractionalPriority?(
    _holder: BattlePokemonStatus,
    _battleContext?: BattleContext,
  ): number | undefined;

  /**
   * 攻撃側: 技によって、相手の特性を無視する効果（例: きんしのちから = 変化技なら true）
   * AbilityRegistry.hasMoldBreaker / isIgnoredByMoldBreaker が、技のコンテキスト（moveCategory など）を渡して呼ぶ。
   * true を返す技では breaksMold（かたやぶり）と同じに扱う
   * @returns 相手の特性を無視するなら true
   */
  breaksMoldFor?(_battleContext?: BattleContext): boolean | undefined;
  // ---- まもる系（Issue #135 一部） ----

  /**
   * 攻撃側: 相手のまもる系（まもる・キングシールド・ワイドガード・ファストガード・たたみがえしなど）を
   * 通り抜ける効果（例: ふかしのこぶし = 接触技なら true）
   * MoveExecutorService が、相手を対象にする技で守りを判定するときに呼ぶ。トリックガードは通り抜けない
   * （本家のふかしのこぶしは技の protect フラグを外すだけで、トリックガードは protect フラグを見ないため）
   * @returns 通り抜けるなら true
   */
  bypassesProtection?(
    _holder: BattlePokemonStatus,
    _battleContext?: BattleContext,
  ): boolean | undefined;
}
