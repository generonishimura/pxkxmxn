import { BaseOpponentStatChangeMoveEffect } from './base/base-opponent-stat-change-move-effect';
import { StatType } from './base/base-stat-change-effect';

/**
 * 「にらみつける」の特殊効果実装
 */
export class LeerEffect extends BaseOpponentStatChangeMoveEffect {
  protected readonly statType: StatType = 'defense';
  protected readonly rankChange = -1;
}
