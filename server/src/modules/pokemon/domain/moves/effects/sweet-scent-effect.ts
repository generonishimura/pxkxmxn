import { BaseOpponentStatChangeMoveEffect } from './base/base-opponent-stat-change-move-effect';
import { StatType } from './base/base-stat-change-effect';

/**
 * 「あまいかおり」の特殊効果実装
 */
export class SweetScentEffect extends BaseOpponentStatChangeMoveEffect {
  protected readonly statType: StatType = 'evasion';
  protected readonly rankChange = -1;
}
