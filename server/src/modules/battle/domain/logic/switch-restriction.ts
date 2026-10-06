import { VolatileState } from '../state/volatile-state';

/**
 * 交代できない理由
 * - ingrain: ねをはる（自分で根を張った）
 * - trapped: くろいまなざし・とおせんぼう・クモのす・たこがためなど（trappedByStatusId）
 * - partialTrap: しめつける・まきつく・ほのおのうずなどのバインド状態
 */
export type SwitchBlocker = 'ingrain' | 'trapped' | 'partialTrap';

/**
 * 逃げられない状態・バインド状態を受けないタイプ（第6世代から）
 */
const TRAP_IMMUNE_TYPE_NAME = 'ゴースト';

/**
 * 交代できない理由を返す（交代できるなら undefined）
 * ゴーストタイプは、ねをはる・逃げられない状態・バインド状態でも交代できる
 * （本家の ingrain も onTrapPokemon で tryTrap を呼ぶので、trapped を受けないゴーストタイプは交代できる。
 *  ねをはるで、ふきとばしなどで引っ込まなくなる効果は、交代させる技を作るときに別に判定する）
 * 注: 交代できないようにする特性（かげふみ・ありじごく・じりょく）と、持ち物（きれいなぬけがら）はまだない
 * @param state 交代しようとしているポケモンの volatileState
 * @param typeNames そのポケモンのタイプ名
 */
export const findSwitchBlocker = (
  state: VolatileState,
  typeNames: readonly string[],
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
  return undefined;
};

/**
 * 交代できないときのメッセージ
 */
export const switchBlockedMessage = (blocker: SwitchBlocker): string =>
  blocker === 'ingrain'
    ? 'Cannot switch out because of its roots'
    : 'Cannot switch out because it is trapped';
