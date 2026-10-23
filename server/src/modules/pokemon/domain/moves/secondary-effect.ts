import { BattleContext } from '../abilities/battle-context.interface';
import { SECONDARY_EFFECT_MOVE_NAMES } from './secondary-effect-move-table';

/**
 * 技の追加効果が発動するかを判定する
 *
 * - battleContext.secondaryEffectChanceMultiplier（てんのめぐみ = 2）を確率に掛ける
 * - target が 'target'（相手への追加効果）で battleContext.secondaryEffectsSuppressed（りんぷん）が
 *   true の場合は発動しない。自分への追加効果（'self'）は止まらない
 * - battleContext.secondaryEffectsRemoved（ちからずくで追加効果が消えた）が true の場合は、相手への
 *   追加効果も自分への追加効果も発動しない。ただし options.ignoresSheerForce が true のもの
 *   （おうじゃのしるし・あくしゅう。本家はちからずくのあとに足す）は消えない
 * - 確率が1以上の場合は乱数を使わずに発動する
 *
 * @param chance 追加効果の発動確率（0.0-1.0）
 * @param battleContext バトルコンテキスト
 * @param target 追加効果の対象（相手 or 自分）
 * @param options ignoresSheerForce: ちからずくで消えない追加効果なら true
 * @returns 発動する場合はtrue
 */
export const rollSecondaryEffect = (
  chance: number,
  battleContext?: BattleContext,
  target: 'target' | 'self' = 'target',
  options: { readonly ignoresSheerForce?: boolean } = {},
): boolean => {
  if (battleContext?.secondaryEffectsRemoved === true && options.ignoresSheerForce !== true) {
    return false;
  }
  if (target === 'target' && battleContext?.secondaryEffectsSuppressed === true) {
    return false;
  }
  const effectiveChance = chance * (battleContext?.secondaryEffectChanceMultiplier ?? 1);
  if (effectiveChance >= 1) {
    return true;
  }
  return Math.random() < effectiveChance;
};

/**
 * ひるみの追加効果をもともと持つ技（Pokemon Showdown の secondaries に flinch があるもの）
 * これらの技には、あくしゅう・おうじゃのしるしのひるみを足さない
 */
const FLINCH_SECONDARY_MOVE_NAMES: ReadonlySet<string> = new Set([
  'エアスラッシュ',
  'おどろかす',
  'かみつく',
  'ホネこんぼう',
  'あくのはどう',
  'ダブルパンツァー',
  'ドラゴンダイブ',
  'じんつうりき',
  'ねこだまし',
  'もえあがるいかり',
  'ほのおのキバ',
  'ずつき',
  'ハートスタンプ',
  'ひっさつまえば',
  'こおりのキバ',
  'つららおとし',
  'アイアンヘッド',
  'ひょうざんおろし',
  'ニードルアーム',
  'いわなだれ',
  'まわしげり',
  'ゴッドバード',
  'いびき',
  'ハードローラー',
  'ふみつけ',
  'かみなりのキバ',
  '３ぼんのや',
  'たつまき',
  'はやてがえし',
  'たきのぼり',
  'しねんのずつき',
  'びりびりちくちく',
]);

/**
 * 技がもともとひるみの追加効果を持つか（あくしゅう・おうじゃのしるしは、この技にはひるみを足さない。本家と同じ）
 */
export const hasFlinchSecondary = (moveName: string | undefined): boolean =>
  moveName !== undefined && FLINCH_SECONDARY_MOVE_NAMES.has(moveName);

/**
 * 技が追加効果（本家の secondary / secondaries）を持つか。ちからずくの対象かどうかに使う
 * 表は secondary-effect-move-table.ts（Pokemon Showdown の値）
 */
export const hasSecondaryEffect = (moveName: string | undefined): boolean =>
  moveName !== undefined && SECONDARY_EFFECT_MOVE_NAMES.has(moveName);
