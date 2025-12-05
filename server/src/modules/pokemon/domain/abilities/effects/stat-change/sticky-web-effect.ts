import { BaseOpponentStatChangeOnSwitchOutEffect } from '../base/base-opponent-stat-change-on-switch-out-effect';

/**
 * いとあみ（Sticky Web）特性の効果
 * 場から下がるとき、相手の素早さを1段階下げる
 */
export class StickyWebEffect extends BaseOpponentStatChangeOnSwitchOutEffect {
  protected readonly statType = 'speed' as const;
  protected readonly rankChange = -1;
}

