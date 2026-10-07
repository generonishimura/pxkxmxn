import { BattleContext } from '../abilities/battle-context.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Move } from '../entities/move.entity';
import type { StatType } from './effects/base/base-stat-change-effect';
// まもる系の仕組み（Issue #102 #103 #107 #108 #120 一部）
import type { ProtectionKind } from '@/modules/battle/domain/state/volatile-state';
import type { SideGuardKind } from '@/modules/battle/domain/state/side-state';

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
 * ため技の 1 ターン目の設定（ソーラービーム・メテオビーム・ロケットずつきなど）
 * MoveBehaviors の charge を持つ技は、この設定がなくても 1 ターンためる
 */
export interface ChargeTurnConfig {
  /**
   * ためずにすぐ出すかどうか（ソーラービームは晴れなら true）
   */
  skipCharge?(attacker: BattlePokemonStatus, battleContext: BattleContext): boolean;

  /**
   * ためたときの効果（メテオビームの特攻+1、ロケットずつきの防御+1）
   * @returns メッセージ（nullの場合は何も起こらない）
   */
  onCharge?(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null>;
}

/**
 * 出し続ける技の設定（さわぐ・ころがる・アイスボール）
 * MoveBehaviors の lockedMove を持つ技（あばれる・げきりんなど）は、この設定がなくても
 * 2〜3 ターン出し続け、終わるとこんらんする
 */
export interface LockedInMoveConfig {
  /** 出し続けるターン数（使ったターンを含む）。[最小, 最大] なら一様乱数で決める */
  readonly turns: number | readonly [number, number];
  /** 出し終わったときに使用者をこんらんにするか（あばれる・げきりん） */
  readonly confusesAtEnd?: boolean;
  /** 出している間、場の誰も眠れないか（さわぐ。volatileState.uproar を書く） */
  readonly preventsSleep?: boolean;
  /** 外れたら終わるか（ころがる・アイスボール） */
  readonly endsOnMiss?: boolean;
}

/**
 * まもる系の技の設定（エンジンが成功判定・状態の書き込み・相手の技を防ぐ処理を行う）
 * - kind: 自分を守る技（まもる・みきり = 'protect'、キングシールド = 'kingsShield'、こらえる = 'endure' など）。
 *   続けて使うと成功率が 1/3 倍ずつになる（1、1/3、1/9、…）
 * - side: 陣営全体を守る技（ワイドガード・ファストガード・トリックガード・たたみがえし）
 */
export type ProtectionMoveConfig =
  | { readonly kind: ProtectionKind; readonly side?: undefined }
  | { readonly side: SideGuardKind; readonly kind?: undefined };

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
   * 技が外れたときに発動する効果（命中判定で外れたときと、相手のまもる系に防がれたとき）
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
   * 技を出そうとした時点で、技が失敗するかを判定する効果（本家の onTryMove。例: もえつきる・でんこうそうげきは
   * 使用者がほのお・でんきタイプでなければ失敗）
   * 技を出した記録（PP・lastMoveId）のあと、ゲンシ天候・ふんじん・ため技・特性の onPrepareHit より先に呼ばれる
   * （失敗したら、へんげんじざい・リベロでタイプは変わらない）。呼ばれた技でも呼ばれる。みらいよちが当たるときは呼ばない
   * battleContext.attackerTypeNames は、この時点の使用者の実効のタイプ
   * @returns 失敗する場合はtrue
   */
  failsOnTryMove?(
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
  // ---- 一時的な状態（volatile）の仕組み（Issue #103 #104 #107 #110 #123 一部） ----

  /**
   * ため技の 1 ターン目の設定（ためずに出す条件・ためたときの効果）
   */
  readonly chargeTurn?: ChargeTurnConfig;

  /**
   * 出し続ける技の設定（さわぐ・ころがるなど）
   */
  readonly lockedIn?: LockedInMoveConfig;

  /**
   * まもる系の技かどうか（まもる・みきり・キングシールドなど）
   * true でない技を出すと、エンジンが volatileState.protectCount を消す
   */
  readonly isProtectionMove?: boolean;

  /**
   * ターンの初め、どちらの技よりも先に呼ばれる効果（くちばしキャノンの加熱、きあいパンチの集中）
   * ExecuteTurnUseCase が、技を選んだポケモンごとに行動順で呼ぶ
   * @returns メッセージ（nullの場合は何も起こらない）
   */
  onTurnStart?(
    user: BattlePokemonStatus,
    opponent: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null>;
  // ---- 場の状態・設置技・交代の仕組み（Issue #102 #103 #110 一部） ----

  /**
   * 技が当たったあと、使用者が控えと交代するか（とんぼがえり・ボルトチェンジ・クイックターン・すてゼリフ・
   * テレポート・さむいギャグ = true、バトンタッチ = 'batonPass'、しっぽきり = 'shedTail'）
   * エンジンが技のあとに使用者の陣営の pendingChoice を書き、行動のすぐあとに交代させる。
   * 使用者がひんし・控えがいない・技が外れた/失敗した/効果がなかったときは交代しない。
   * 変化技の onUse が 'But it failed' で始まるメッセージを返したときも交代しない（エンジンが selfSwitchCancelled を立てる）。
   * それ以外で交代をやめるときは battleContext.selfSwitchCancelled = true にする（すてゼリフで能力が下がらなかったとき）
   */
  readonly selfSwitch?: true | 'batonPass' | 'shedTail';

  /**
   * 技が当たったあと、相手を控えとランダムに入れ替えるか（ほえる・ふきとばし・ドラゴンテール・ともえなげ）
   * エンジンが技のあとに相手の陣営の forcedSwitch を書き、行動のすぐあとに入れ替える。
   * 変化技は、相手に控えがいない・ねをはっている・特性の preventsForcedSwitch（きゅうばん・ばんけん）なら失敗する。
   * 攻撃技は、ダメージを与えたときだけ入れ替える（みがわりに当たったときは入れ替えない）
   */
  readonly forceSwitch?: boolean;
  // ---- まもる系の仕組み（Issue #102 #103 #107 #108 #120 一部） ----

  /**
   * まもる系の技の設定（まもる = { kind: 'protect' }、ワイドガード = { side: 'wideGuard' } など）
   * 変化技のとき、MoveExecutorService が onUse の前に、成功の判定（このターン最後に動くなら失敗、
   * 続けて使ったときの 1/3^n、たたみがえしは出てから最初の行動だけ）と、volatileState.protection・
   * SideConditions・protectCount の書き込みを行う。失敗したら onUse は呼ばない。
   * 相手の技を防ぐ処理・接触したときの効果（キングシールドの攻撃 -1 など）もエンジンが行う
   */
  readonly protection?: ProtectionMoveConfig;
}
