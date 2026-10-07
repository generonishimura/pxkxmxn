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
  /** ポケモンの volatileState */
  readonly volatileState: VolatileState;
  /** バトルの sideState（じゅうりょくを見る）。省略するとじゅうりょくはないとみなす */
  readonly sideState?: SideState;
}

/**
 * ポケモンが地面にいるか（本家の Pokemon.isGrounded）
 * フィールドの効果・まきびし・どくびし・ねばねばネット・ありじごくが、地面にいるポケモンにだけ効く
 *
 * 1. じゅうりょくの間・ねをはっている間は地面にいる
 * 2. ひこうタイプ（はねやすめをしたターンを除く）・ふゆう・でんじふゆう・テレキネシスなら地面にいない
 *
 * 注: タイプは育成ポケモンのタイプで判定する（みずびたしなどのタイプの上書きは見ない。ダメージ計算と同じ）。
 *     持ち物（ふうせん・くろいてっきゅう）と、うちおとすはまだない
 */
export const isGrounded = (params: GroundedParams): boolean => {
  const state = params.volatileState;
  if (params.sideState && getGlobalFieldState(params.sideState).gravityTurns !== undefined) {
    return true;
  }
  if (state.ingrain === true) {
    return true;
  }
  if (params.typeNames.includes(AIRBORNE_TYPE_NAME) && state.roosting !== true) {
    return false;
  }
  if (isAirborneAbility(params.abilityName)) {
    return false;
  }
  return state.magnetRiseTurns === undefined && state.telekinesisTurns === undefined;
};
