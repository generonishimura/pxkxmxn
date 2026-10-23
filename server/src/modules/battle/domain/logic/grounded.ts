import { VolatileState } from '../state/volatile-state';
import { SideState, getGlobalFieldState } from '../state/side-state';

/**
 * 地面にいないタイプ
 */
const AIRBORNE_TYPE_NAME = 'ひこう';

/**
 * 地面にいない特性（本家の isGrounded と同じく、ふゆうだけ）
 */
const AIRBORNE_ABILITY_NAMES: readonly string[] = ['ふゆう'];

/**
 * 地面にいない持ち物（本家の isGrounded と同じく、ふうせんだけ）
 */
const AIRBORNE_ITEM_NAMES: readonly string[] = ['ふうせん'];

/**
 * 持っていると、ひこうタイプ・ふゆう・でんじふゆう・テレキネシスでも地面にいる持ち物（本家の isGrounded と同じ）
 */
const GROUNDING_ITEM_NAMES: readonly string[] = ['くろいてっきゅう'];

/**
 * 持っていると地面にいる持ち物か（くろいてっきゅう）
 * DamageCalculator が、この持ち物のポケモンにはじめん技を当てる（ひこうタイプ・ふゆうでも。じゅうりょくと同じ）
 */
export const isGroundingItem = (itemName: string | undefined): boolean =>
  itemName !== undefined && GROUNDING_ITEM_NAMES.includes(itemName);

/**
 * 地面にいない特性か（ふゆう）
 * じゅうりょくの間は、この特性のじめん技の無効を DamageCalculator が無視する
 */
export const isAirborneAbility = (abilityName: string | undefined): boolean =>
  abilityName !== undefined && AIRBORNE_ABILITY_NAMES.includes(abilityName);

/**
 * 地面にいるかの判定に使う情報
 */
export interface GroundedParams {
  /** ポケモンのタイプ名（育成ポケモンのタイプ） */
  readonly typeNames: readonly string[];
  /** ポケモンの特性名 */
  readonly abilityName?: string;
  /** ポケモンが今持っている持ち物の名前（resolveItemName。ふうせん・くろいてっきゅう） */
  readonly itemName?: string;
  /** ポケモンの volatileState */
  readonly volatileState: VolatileState;
  /** バトルの sideState（じゅうりょくを見る）。省略するとじゅうりょくはないとみなす */
  readonly sideState?: SideState;
}

/**
 * ポケモンが地面にいるか（本家の Pokemon.isGrounded）
 * フィールドの効果・まきびし・どくびし・ねばねばネット・ありじごくが、地面にいるポケモンにだけ効く
 *
 * 1. じゅうりょくの間・ねをはっている間・くろいてっきゅうを持っている間は地面にいる
 * 2. ひこうタイプ（はねやすめをしたターンを除く）・ふゆう・でんじふゆう・テレキネシス・ふうせんなら地面にいない
 *
 * 注: タイプは育成ポケモンのタイプで判定する（みずびたしなどのタイプの上書きは見ない。ダメージ計算と同じ）。
 *     うちおとすはまだない
 */
export const isGrounded = (params: GroundedParams): boolean => {
  const state = params.volatileState;
  if (params.sideState && getGlobalFieldState(params.sideState).gravityTurns !== undefined) {
    return true;
  }
  if (state.ingrain === true) {
    return true;
  }
  if (isGroundingItem(params.itemName)) {
    return true;
  }
  if (params.typeNames.includes(AIRBORNE_TYPE_NAME) && state.roosting !== true) {
    return false;
  }
  if (isAirborneAbility(params.abilityName)) {
    return false;
  }
  if (params.itemName !== undefined && AIRBORNE_ITEM_NAMES.includes(params.itemName)) {
    return false;
  }
  return state.magnetRiseTurns === undefined && state.telekinesisTurns === undefined;
};
