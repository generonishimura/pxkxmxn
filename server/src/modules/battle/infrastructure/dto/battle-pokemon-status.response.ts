import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import { VolatileState } from '../../domain/state/volatile-state';

/**
 * 応答に載せる volatileState（相手に見せないキーを外したもの）
 * - illusionStatusId: イリュージョンで化けている先。見えると、化けていることが相手に分かる
 */
export type BattlePokemonStatusVolatileStateResponse = Omit<VolatileState, 'illusionStatusId'>;

/**
 * entity の値の欄（メソッドを除く。JSON に載る欄）
 */
type BattlePokemonStatusFields = {
  readonly [K in keyof BattlePokemonStatus as BattlePokemonStatus[K] extends (
    ...args: never[]
  ) => unknown
    ? never
    : K]: BattlePokemonStatus[K];
};

/**
 * API・WebSocket で返すバトル中のポケモンの状態
 * entity と同じ欄を持ち、volatileState だけ相手に見せないキーを外す（docs/battle-state.md の 8 章）
 */
export type BattlePokemonStatusResponse = Omit<BattlePokemonStatusFields, 'volatileState'> & {
  readonly volatileState: BattlePokemonStatusVolatileStateResponse;
};

const toVolatileStateResponse = (
  state: VolatileState,
): BattlePokemonStatusVolatileStateResponse => {
  const { illusionStatusId: _illusionStatusId, ...visible } = state;
  return visible;
};

/**
 * バトル中のポケモンの状態を、応答の形に詰め替える
 */
export const toBattlePokemonStatusResponses = (
  statuses: readonly BattlePokemonStatus[],
): BattlePokemonStatusResponse[] =>
  statuses.map(status => ({
    ...status,
    volatileState: toVolatileStateResponse(status.volatileState),
  }));
