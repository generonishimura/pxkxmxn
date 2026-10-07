import { Battle } from '@/modules/battle/domain/entities/battle.entity';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';
import { Weather, Field } from '@/modules/battle/domain/entities/battle.entity';
import { ITrainedPokemonRepository } from '@/modules/trainer/domain/trainer.repository.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import type { MoveFlag } from '../moves/move-flags';
import type { StatType } from '../moves/effects/base/base-stat-change-effect';
import type { CallMove } from '../battle-events/called-move';
import type { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import type {
  IMoveRepository,
  ITypeEffectivenessRepository,
} from '../pokemon.repository.interface';

/**
 * ランク補正前の実数値（種族値・個体値・努力値・性格補正を反映済み）
 */
export interface BattleStatValues {
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}

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
   * 技本来のタイプ名（技・特性の modifyMoveType でタイプを変える前、例: "ノーマル"）
   * -スキン系の特性で「もとはノーマル技だったか」を判定するのに使う
   */
  baseMoveTypeName?: string;

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
   * 反動ダメージ、または外したときの自傷がある技かどうか（技の hasRecoil）
   * すてみなどの特性で使用
   */
  hasRecoil?: boolean;

  /**
   * 追加効果がある技かどうか
   * ちからずくなどの特性で使用
   */
  hasSecondaryEffect?: boolean;

  /**
   * 技名（DB の name、例: "ほのおのパンチ"）
   */
  moveName?: string;

  /**
   * 技の静的フラグ（MoveFlags 表の値に、攻撃側特性の modifyMoveFlags を反映したもの）
   */
  moveFlags?: ReadonlySet<MoveFlag>;

  /**
   * 技の優先度（特性補正前）
   */
  movePriority?: number;

  /**
   * 攻撃側特性の modifyPriority を反映した技の優先度（いたずらごころなど）
   * 技の実行時に入る。じょおうのいげんなどの preventsMove で使う
   */
  effectivePriority?: number;

  /**
   * 防御側の特性名（日本語名）
   * オーラ系とオーラブレイクの相互作用などで使用
   */
  defenderAbilityName?: string;

  /**
   * 攻撃側（技の使用者）の最新の状態。ランク・HP・状態異常を参照できる
   * 行動順の判定では、行動するポケモン自身が入る
   */
  attacker?: BattlePokemonStatus;

  /**
   * 防御側（技を受ける側）の最新の状態
   */
  defender?: BattlePokemonStatus;

  /**
   * 攻撃側のランク補正前の実数値
   * 行動順の判定では、行動するポケモン自身の実数値が入る
   */
  attackerStats?: BattleStatValues;

  /**
   * 防御側のランク補正前の実数値
   */
  defenderStats?: BattleStatValues;

  /**
   * このヒットのタイプ相性倍率（0, 0.25, 0.5, 1, 2, 4）
   * ダメージ計算中（isImmuneToType / modifyDamageDealt / modifyDamage / modifyBasePower）で設定される
   */
  typeEffectiveness?: number;

  /**
   * 技全体のタイプ相性倍率（技のタイプを決めたあとの値。防御側特性の isImmuneToType も含む）
   * 0 なら技が相手に効かない。ダメージ技の executeMove で、技の beforeDamage の前に設定される
   * （シャドースチールは 0 ならランクを奪わない）
   */
  moveTypeEffectiveness?: number;

  /**
   * このターン、技の使用者が最後に行動するかどうか（アナライズ）
   */
  isLastToMove?: boolean;

  /**
   * 何回目のヒットか（0始まり）。連続技・おやこあいの2発目以降で1以上になる
   */
  hitIndex?: number;

  /**
   * 追加効果の発動確率に掛ける倍率（てんのめぐみ = 2）
   * rollSecondaryEffect が参照する
   */
  secondaryEffectChanceMultiplier?: number;

  /**
   * 相手に対する追加効果を発動させないかどうか（りんぷん）
   * rollSecondaryEffect が参照する
   */
  secondaryEffectsSuppressed?: boolean;

  /**
   * 無視する攻撃側のランク（てんねんの防御側など）
   * ダメージ計算・命中判定で、ここに含まれるランクを0として扱う
   */
  ignoredAttackerRanks?: ReadonlySet<StatType>;

  /**
   * 無視する防御側のランク（なしくずし、てんねんの攻撃側、しんがんなど）
   * ダメージ計算・命中判定で、ここに含まれるランクを0として扱う
   */
  ignoredDefenderRanks?: ReadonlySet<StatType>;
  // ---- 一時的な状態（volatile）の仕組み（Issue #103 #104 #107 #135 一部） ----

  /**
   * 技の ID（Move の ID）。技の実行・ダメージ計算で入る（のろわれボディのかなしばりなど）
   */
  moveId?: number;

  /**
   * 相手がこのターンにまだ技を出していなければ、相手が出す予定の技の ID（さきどり・ふいうち）
   * 相手がもう行動した・交代した・技を選んでいないときは undefined
   */
  defenderPendingMoveId?: number;

  /**
   * 別の技を、技の処理の流れに乗せて出す（ゆびをふる・ねごと・まねっこなど）
   * 技の実行（MoveExecutorService）のコンテキストにだけ入る
   */
  callMove?: CallMove;

  /**
   * この技を呼び出した技・特性の名前（ゆびをふるで出た技なら 'ゆびをふる'）。呼ばれた技のときだけ入る
   */
  calledBy?: string;

  /**
   * 攻撃側・防御側の「状態異常として扱う状態」（ぜったいねむりならねむり）
   * 状態異常があればその状態異常、なければ特性の treatedAsStatusCondition。getEffectiveStatusCondition が読む
   */
  attackerEffectiveStatus?: StatusCondition | null;
  defenderEffectiveStatus?: StatusCondition | null;

  /**
   * この技がみがわりに当たったかどうか（afterDamage の damage は、みがわりに与えた量）
   */
  hitSubstitute?: boolean;

  /**
   * 技のリポジトリ（技名・分類・PP を引く。ものまね・スケッチ・ねこのて・ねごとが候補の技を調べる）
   * 技の実行（MoveExecutorService）のコンテキストにだけ入る
   */
  moveRepository?: IMoveRepository;
  // ---- 場の状態・設置技・交代の仕組み（Issue #103 #135 一部） ----

  /**
   * 技の効果で、技の selfSwitch（とんぼがえり・すてゼリフなど）の交代をやめる（すてゼリフで能力が下がらなかったとき）
   * 技の onUse / onHit / afterDamage の中で true にする
   */
  selfSwitchCancelled?: boolean;

  /**
   * 攻撃側の手持ちがひんしになった延べ数（そうだいしょう。本家の side.totalFainted。復活しても減らない。
   * 自分が前にひんしになって復活した回数も入る）
   * ダメージ技の実行（beforeDamage 以降）と、ダメージ計算の特性フック（modifyBasePower など）で入る
   */
  attackerFaintedAllyCount?: number;
  // ---- タイプ変更・フォルムチェンジ・特性の書き換えの仕組み（Issue #103 #112 #114 #119 #135 一部） ----

  /**
   * 攻撃側・防御側の実効のタイプ名（みずびたし・はねやすめ・ハロウィン・フォルムなどを反映。resolveEffectiveTypeNames）
   * 技の実行（MoveExecutorService）のコンテキストに入る。タイプなし（'???'）を含むことがある
   */
  attackerTypeNames?: readonly string[];
  defenderTypeNames?: readonly string[];

  /**
   * タイプ相性表のリポジトリ（テクスチャー２が、技を半減以下にするタイプを探す）
   * 技の実行（MoveExecutorService）のコンテキストに入る
   */
  typeEffectivenessRepository?: ITypeEffectivenessRepository;
}
