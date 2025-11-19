import { BaseOpponentStatChangeEffect } from '../base/base-opponent-stat-change-effect';

/**
 * 「いかく」特性の効果実装
 *
 * 効果: 場に出すとき、相手の攻撃ランクを1段階下げる
 */
export class IntimidateEffect extends BaseOpponentStatChangeEffect {
  protected readonly statType = 'attack' as const;
  protected readonly rankChange = -1;
}
