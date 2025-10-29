/**
 * 状態異常の列挙型
 */
export enum StatusCondition {
  None = 'None',
  Burn = 'Burn', // やけど
  Freeze = 'Freeze', // こおり
  Paralysis = 'Paralysis', // まひ
  Poison = 'Poison', // どく
  BadPoison = 'BadPoison', // もうどく
  Sleep = 'Sleep', // ねむり
}

