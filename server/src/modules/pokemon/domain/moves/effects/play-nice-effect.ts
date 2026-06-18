import { BaseOpponentStatChangeMoveEffect } from './base/base-opponent-stat-change-move-effect';
import { StatType } from './base/base-stat-change-effect';

/**
 * 「なかよくする」の特殊効果実装
 */
export class PlayNiceEffect extends BaseOpponentStatChangeMoveEffect {
  protected readonly statType: StatType = 'attack';
  protected readonly rankChange = -1;
}
