import { BaseSelfStatChangeMoveEffect } from './base/base-self-stat-change-move-effect';
import { StatType } from './base/base-stat-change-effect';

/**
 * 「からにこもる」の特殊効果実装
 */
export class WithdrawEffect extends BaseSelfStatChangeMoveEffect {
  protected readonly statType: StatType = 'defense';
  protected readonly rankChange = 1;
}
