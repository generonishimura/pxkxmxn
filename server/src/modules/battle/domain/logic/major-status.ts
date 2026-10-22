import { StatusCondition } from '../entities/status-condition.enum';

/**
 * 状態異常（やけど・こおり・まひ・どく・もうどく・ねむり）
 * StatusCondition にはひるみ・こんらんも入っているため、それらを除いた集合
 */
const MAJOR_STATUS_CONDITIONS: ReadonlySet<StatusCondition> = new Set([
  StatusCondition.Burn,
  StatusCondition.Freeze,
  StatusCondition.Paralysis,
  StatusCondition.Poison,
  StatusCondition.BadPoison,
  StatusCondition.Sleep,
]);

/**
 * 状態異常（やけど・こおり・まひ・どく・もうどく・ねむり）かどうか
 * たたりめ・からげんきなど「状態異常のときに威力が上がる」効果で使う。ひるみ・こんらんは含まない
 * @param status ポケモンの状態
 * @returns 状態異常ならtrue
 */
export const isMajorStatus = (status: StatusCondition | null | undefined): boolean =>
  status !== null && status !== undefined && MAJOR_STATUS_CONDITIONS.has(status);
