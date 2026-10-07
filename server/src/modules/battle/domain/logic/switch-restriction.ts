import { VolatileState } from '../state/volatile-state';

/**
 * 交代できない理由
 * - ingrain: ねをはる（自分で根を張った）
 * - trapped: くろいまなざし・とおせんぼう・クモのす・たこがためなど（trappedByStatusId）
 * - partialTrap: しめつける・まきつく・ほのおのうずなどのバインド状態
 * - trappingAbility: 相手の特性（かげふみ・ありじごく・じりょく。特性の trapsOpponent）
 * - fairyLock: フェアリーロック（GlobalFieldState.fairyLockTurns）
 */
export type SwitchBlocker = 'ingrain' | 'trapped' | 'partialTrap' | 'trappingAbility' | 'fairyLock';

/**
 * 交代できない理由のうち、使用者の volatileState 以外から決まるもの
 */
export interface SwitchBlockerOptions {
  /** 相手の特性で逃げられない（相手の特性の trapsOpponent が true を返した） */
  readonly trappedByAbility?: boolean;
  /** フェアリーロックの間か */
  readonly fairyLock?: boolean;
}

/**
 * 逃げられない状態・バインド状態を受けないタイプ（第6世代から）
 */
const TRAP_IMMUNE_TYPE_NAME = 'ゴースト';

/**
 * 交代できない理由を返す（交代できるなら undefined）
 * ゴーストタイプは、ねをはる・逃げられない状態・バインド状態・相手の特性・フェアリーロックでも交代できる
 * （本家の ingrain・fairylock・かげふみなども tryTrap を呼ぶので、trapped を受けないゴーストタイプは交代できる。
 *  ねをはる・きゅうばんで、ふきとばしなどで引っ込まなくなる効果は、技の forceSwitch でエンジンが判定する）
 * 注: とんぼがえり・ほえるなどの技・特性による交代は、この判定を受けない（本家と同じ）。持ち物（きれいなぬけがら）はない
 * @param state 交代しようとしているポケモンの volatileState
 * @param typeNames そのポケモンのタイプ名
 */
export const findSwitchBlocker = (
  state: VolatileState,
  typeNames: readonly string[],
  options: SwitchBlockerOptions = {},
): SwitchBlocker | undefined => {
  if (typeNames.includes(TRAP_IMMUNE_TYPE_NAME)) {
    return undefined;
  }
  if (state.ingrain === true) {
    return 'ingrain';
  }
  if (state.trappedByStatusId !== undefined) {
    return 'trapped';
  }
  if (state.partialTrap !== undefined) {
    return 'partialTrap';
  }
  if (options.trappedByAbility === true) {
    return 'trappingAbility';
  }
  if (options.fairyLock === true) {
    return 'fairyLock';
  }
  return undefined;
};

/**
 * 交代できないときのメッセージ
 */
export const switchBlockedMessage = (blocker: SwitchBlocker): string =>
  blocker === 'ingrain'
    ? 'Cannot switch out because of its roots'
    : 'Cannot switch out because it is trapped';
